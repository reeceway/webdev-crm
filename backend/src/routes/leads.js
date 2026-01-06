const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// Apply auth to all routes
router.use(authenticateToken);

// Get all leads
router.get('/', (req, res) => {
  try {
    const { search, status, source, assigned_to, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT l.*, u.name as assigned_to_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (l.company_name LIKE ? OR l.contact_name LIKE ? OR l.email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (status) {
      query += ' AND l.status = ?';
      params.push(status);
    }

    if (source) {
      query += ' AND l.source = ?';
      params.push(source);
    }

    if (assigned_to) {
      query += ' AND l.assigned_to = ?';
      params.push(assigned_to);
    }

    query += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const leads = db.prepare(query).all(...params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM leads l WHERE 1=1';
    const countParams = [];
    if (search) {
      countQuery += ' AND (l.company_name LIKE ? OR l.contact_name LIKE ? OR l.email LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    if (status) {
      countQuery += ' AND l.status = ?';
      countParams.push(status);
    }
    if (source) {
      countQuery += ' AND l.source = ?';
      countParams.push(source);
    }
    if (assigned_to) {
      countQuery += ' AND l.assigned_to = ?';
      countParams.push(assigned_to);
    }
    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({ leads, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    logger.error('Get leads error', error, { search, status, source, assigned_to });
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// Get lead statistics / pipeline
router.get('/stats', (req, res) => {
  try {
    const stats = {
      byStatus: db.prepare(`
        SELECT status, COUNT(*) as count, SUM(estimated_value) as total_value
        FROM leads
        GROUP BY status
      `).all(),
      bySource: db.prepare(`
        SELECT source, COUNT(*) as count
        FROM leads
        WHERE source IS NOT NULL
        GROUP BY source
      `).all(),
      totalLeads: db.prepare('SELECT COUNT(*) as count FROM leads').get().count,
      totalValue: db.prepare('SELECT SUM(estimated_value) as total FROM leads').get().total || 0,
      weightedValue: db.prepare(`
        SELECT SUM(estimated_value * probability / 100) as total 
        FROM leads 
        WHERE status NOT IN ('won', 'lost')
      `).get().total || 0,
      upcomingFollowUps: db.prepare(`
        SELECT COUNT(*) as count FROM leads 
        WHERE next_follow_up <= date('now', '+7 days') 
        AND next_follow_up >= date('now')
        AND status NOT IN ('won', 'lost')
      `).get().count,
      overdueFollowUps: db.prepare(`
        SELECT COUNT(*) as count FROM leads 
        WHERE next_follow_up < date('now')
        AND status NOT IN ('won', 'lost')
      `).get().count
    };

    res.json(stats);
  } catch (error) {
    console.error('Get lead stats error:', error);
    res.status(500).json({ error: 'Failed to fetch lead statistics' });
  }
});

// Get single lead
router.get('/:id', (req, res) => {
  try {
    const lead = db.prepare(`
      SELECT l.*, u.name as assigned_to_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      WHERE l.id = ?
    `).get(req.params.id);
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Get associated tasks
    const tasks = db.prepare('SELECT * FROM tasks WHERE lead_id = ? ORDER BY due_date ASC').all(req.params.id);
    
    // Get associated notes
    const notes = db.prepare('SELECT * FROM notes WHERE lead_id = ? ORDER BY created_at DESC').all(req.params.id);

    res.json({ ...lead, tasks, notes });
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

// Create lead
router.post('/', [
  body('contact_name').trim().notEmpty().withMessage('Contact name is required'),
  body('status').optional().isIn(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']),
  body('probability').optional().isInt({ min: 0, max: 100 })
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { 
    company_name, contact_name, email, phone, website, source,
    status = 'new', estimated_value, probability = 50, notes, 
    next_follow_up, assigned_to
  } = req.body;

  try {
    const result = db.prepare(`
      INSERT INTO leads (
        company_name, contact_name, email, phone, website, source,
        status, estimated_value, probability, notes, next_follow_up, assigned_to
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      company_name, contact_name, email, phone, website, source,
      status, estimated_value, probability, notes, next_follow_up, 
      assigned_to || req.user.id
    );

    const lead = db.prepare(`
      SELECT l.*, u.name as assigned_to_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      WHERE l.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ message: 'Lead created successfully', lead });
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// Update lead
router.put('/:id', (req, res) => {
  const { 
    company_name, contact_name, email, phone, website, source,
    status, estimated_value, probability, notes, next_follow_up, assigned_to
  } = req.body;

  try {
    const existing = db.prepare('SELECT id FROM leads WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    db.prepare(`
      UPDATE leads 
      SET company_name = COALESCE(?, company_name),
          contact_name = COALESCE(?, contact_name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          website = COALESCE(?, website),
          source = COALESCE(?, source),
          status = COALESCE(?, status),
          estimated_value = COALESCE(?, estimated_value),
          probability = COALESCE(?, probability),
          notes = COALESCE(?, notes),
          next_follow_up = COALESCE(?, next_follow_up),
          assigned_to = COALESCE(?, assigned_to),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      company_name, contact_name, email, phone, website, source,
      status, estimated_value, probability, notes, next_follow_up, assigned_to,
      req.params.id
    );

    const lead = db.prepare(`
      SELECT l.*, u.name as assigned_to_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_to = u.id
      WHERE l.id = ?
    `).get(req.params.id);

    res.json({ message: 'Lead updated successfully', lead });
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Convert lead to client/company
router.post('/:id/convert', (req, res) => {
  try {
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Create company if company_name exists
    let companyId = null;
    if (lead.company_name) {
      const companyResult = db.prepare(`
        INSERT INTO companies (name, website, phone)
        VALUES (?, ?, ?)
      `).run(lead.company_name, lead.website, lead.phone);
      companyId = companyResult.lastInsertRowid;
    }

    // Create client
    const nameParts = lead.contact_name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    const clientResult = db.prepare(`
      INSERT INTO clients (company_id, first_name, last_name, email, phone, is_primary_contact)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(companyId, firstName, lastName, lead.email, lead.phone);

    // Update lead status to won
    db.prepare(`
      UPDATE leads SET status = 'won', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(req.params.id);

    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(clientResult.lastInsertRowid);
    const company = companyId ? db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId) : null;

    res.json({ 
      message: 'Lead converted successfully', 
      client,
      company,
      lead_id: lead.id
    });
  } catch (error) {
    console.error('Convert lead error:', error);
    res.status(500).json({ error: 'Failed to convert lead' });
  }
});

// Delete lead
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM leads WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// Bulk import leads
router.post('/import', (req, res) => {
  try {
    const { leads } = req.body;
    
    if (!leads || !Array.isArray(leads)) {
      return res.status(400).json({ error: 'leads array is required' });
    }

    const insertLead = db.prepare(`
      INSERT INTO leads (contact_name, company_name, email, phone, website, source, status, estimated_value, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    let imported = 0;
    let skipped = 0;

    for (const lead of leads) {
      try {
        // Check if lead already exists
        const existing = db.prepare('SELECT id FROM leads WHERE company_name = ? AND contact_name = ?')
          .get(lead.company_name || '', lead.contact_name || '');
        
        if (existing) {
          skipped++;
          continue;
        }

        insertLead.run(
          lead.contact_name || 'Unknown',
          lead.company_name || '',
          lead.email || null,
          lead.phone || null,
          lead.website || null,
          lead.source || 'import',
          lead.status || 'new',
          lead.estimated_value || null,
          lead.notes || null
        );
        imported++;
      } catch (err) {
        console.error('Error importing lead:', err.message);
        skipped++;
      }
    }

    res.json({ 
      message: `Imported ${imported} leads, skipped ${skipped} duplicates`,
      imported,
      skipped
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({ error: 'Failed to import leads' });
  }
});

module.exports = router;
