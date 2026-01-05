const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');

// Get all pipeline deals with optional filtering
router.get('/', auth, (req, res) => {
  try {
    const { stage, assigned_to, search, limit = 100, offset = 0 } = req.query;
    
    let query = `
      SELECT p.*, u.name as assigned_to_name
      FROM pipeline p
      LEFT JOIN users u ON p.assigned_to = u.id
      WHERE 1=1
    `;
    const params = [];

    if (stage) {
      query += ' AND p.stage = ?';
      params.push(stage);
    }

    if (assigned_to) {
      query += ' AND p.assigned_to = ?';
      params.push(assigned_to);
    }

    if (search) {
      query += ' AND (p.company_name LIKE ? OR p.contact_name LIKE ? OR p.deal_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Get total count
    const countQuery = query.replace('SELECT p.*, u.name as assigned_to_name', 'SELECT COUNT(*) as total');
    const total = db.prepare(countQuery).get(...params).total;

    query += ' ORDER BY p.deal_value DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const deals = db.prepare(query).all(...params);

    res.json({ deals, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('Error fetching pipeline:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline deals' });
  }
});

// Get pipeline stages summary (for kanban view)
router.get('/stages', auth, (req, res) => {
  try {
    const stages = [
      { id: 'qualification', name: 'Qualification', probability: 20 },
      { id: 'meeting', name: 'Meeting Scheduled', probability: 40 },
      { id: 'proposal', name: 'Proposal Sent', probability: 60 },
      { id: 'negotiation', name: 'Negotiation', probability: 80 },
      { id: 'closed_won', name: 'Closed Won', probability: 100 },
      { id: 'closed_lost', name: 'Closed Lost', probability: 0 }
    ];

    const summary = stages.map(stage => {
      const result = db.prepare(`
        SELECT COUNT(*) as count, COALESCE(SUM(deal_value), 0) as total_value
        FROM pipeline WHERE stage = ?
      `).get(stage.id);
      
      return {
        ...stage,
        count: result.count,
        total_value: result.total_value
      };
    });

    res.json({ stages: summary });
  } catch (error) {
    console.error('Error fetching stages:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline stages' });
  }
});

// Get single deal
router.get('/:id', auth, (req, res) => {
  try {
    const deal = db.prepare(`
      SELECT p.*, u.name as assigned_to_name
      FROM pipeline p
      LEFT JOIN users u ON p.assigned_to = u.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json(deal);
  } catch (error) {
    console.error('Error fetching deal:', error);
    res.status(500).json({ error: 'Failed to fetch deal' });
  }
});

// Create new deal
router.post('/', auth, (req, res) => {
  try {
    const {
      lead_id,
      company_name,
      contact_name,
      contact_email,
      contact_phone,
      deal_name,
      deal_value,
      stage = 'qualification',
      probability,
      expected_close_date,
      source,
      notes,
      assigned_to
    } = req.body;

    if (!company_name || !deal_name) {
      return res.status(400).json({ error: 'Company name and deal name are required' });
    }

    // Calculate probability based on stage if not provided
    const stageProbabilities = {
      qualification: 20,
      meeting: 40,
      proposal: 60,
      negotiation: 80,
      closed_won: 100,
      closed_lost: 0
    };

    const finalProbability = probability ?? stageProbabilities[stage] ?? 20;

    const result = db.prepare(`
      INSERT INTO pipeline (
        lead_id, company_name, contact_name, contact_email, contact_phone,
        deal_name, deal_value, stage, probability, expected_close_date,
        source, notes, assigned_to
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      lead_id || null,
      company_name,
      contact_name || null,
      contact_email || null,
      contact_phone || null,
      deal_name,
      deal_value || 0,
      stage,
      finalProbability,
      expected_close_date || null,
      source || null,
      notes || null,
      assigned_to || null
    );

    const newDeal = db.prepare('SELECT * FROM pipeline WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newDeal);
  } catch (error) {
    console.error('Error creating deal:', error);
    res.status(500).json({ error: 'Failed to create deal' });
  }
});

// Update deal
router.put('/:id', auth, (req, res) => {
  try {
    const {
      company_name,
      contact_name,
      contact_email,
      contact_phone,
      deal_name,
      deal_value,
      stage,
      probability,
      expected_close_date,
      source,
      notes,
      assigned_to
    } = req.body;

    // Auto-update probability when stage changes
    const stageProbabilities = {
      qualification: 20,
      meeting: 40,
      proposal: 60,
      negotiation: 80,
      closed_won: 100,
      closed_lost: 0
    };

    const finalProbability = probability ?? (stage ? stageProbabilities[stage] : undefined);

    const result = db.prepare(`
      UPDATE pipeline SET
        company_name = COALESCE(?, company_name),
        contact_name = COALESCE(?, contact_name),
        contact_email = COALESCE(?, contact_email),
        contact_phone = COALESCE(?, contact_phone),
        deal_name = COALESCE(?, deal_name),
        deal_value = COALESCE(?, deal_value),
        stage = COALESCE(?, stage),
        probability = COALESCE(?, probability),
        expected_close_date = COALESCE(?, expected_close_date),
        source = COALESCE(?, source),
        notes = COALESCE(?, notes),
        assigned_to = COALESCE(?, assigned_to),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      company_name,
      contact_name,
      contact_email,
      contact_phone,
      deal_name,
      deal_value,
      stage,
      finalProbability,
      expected_close_date,
      source,
      notes,
      assigned_to,
      req.params.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const updated = db.prepare('SELECT * FROM pipeline WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating deal:', error);
    res.status(500).json({ error: 'Failed to update deal' });
  }
});

// Move deal to different stage (quick update)
router.patch('/:id/stage', auth, (req, res) => {
  try {
    const { stage } = req.body;
    
    const stageProbabilities = {
      qualification: 20,
      meeting: 40,
      proposal: 60,
      negotiation: 80,
      closed_won: 100,
      closed_lost: 0
    };

    const probability = stageProbabilities[stage] ?? 20;

    const result = db.prepare(`
      UPDATE pipeline SET stage = ?, probability = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(stage, probability, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const updated = db.prepare('SELECT * FROM pipeline WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating stage:', error);
    res.status(500).json({ error: 'Failed to update stage' });
  }
});

// Convert lead to pipeline deal
router.post('/from-lead/:leadId', auth, (req, res) => {
  try {
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.leadId);
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const { deal_name, deal_value, stage = 'qualification' } = req.body;

    const stageProbabilities = {
      qualification: 20,
      meeting: 40,
      proposal: 60,
      negotiation: 80,
      closed_won: 100,
      closed_lost: 0
    };

    const result = db.prepare(`
      INSERT INTO pipeline (
        lead_id, company_name, contact_name, contact_email, contact_phone,
        deal_name, deal_value, stage, probability, source, notes, assigned_to
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      lead.id,
      lead.company_name || 'Unknown Company',
      lead.contact_name,
      lead.email,
      lead.phone,
      deal_name || `${lead.company_name || lead.contact_name} - Website Project`,
      deal_value || lead.estimated_value || 5000,
      stage,
      stageProbabilities[stage],
      lead.source,
      lead.notes,
      lead.assigned_to
    );

    // Update lead status to qualified
    db.prepare(`UPDATE leads SET status = 'qualified', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(req.params.leadId);

    const newDeal = db.prepare('SELECT * FROM pipeline WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newDeal);
  } catch (error) {
    console.error('Error converting lead:', error);
    res.status(500).json({ error: 'Failed to convert lead to deal' });
  }
});

// Delete deal
router.delete('/:id', auth, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM pipeline WHERE id = ?').run(req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json({ message: 'Deal deleted successfully' });
  } catch (error) {
    console.error('Error deleting deal:', error);
    res.status(500).json({ error: 'Failed to delete deal' });
  }
});

// ==================== ACTIVITIES / CONVERSATION LOG ====================

// Get all activities for a deal
router.get('/:id/activities', auth, (req, res) => {
  try {
    const activities = db.prepare(`
      SELECT a.*, u.name as created_by_name
      FROM pipeline_activities a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.pipeline_id = ?
      ORDER BY a.created_at DESC
    `).all(req.params.id);

    res.json({ activities });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Add activity/note to a deal
router.post('/:id/activities', auth, (req, res) => {
  try {
    const { activity_type = 'note', title, content, contact_method, outcome, next_steps } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const result = db.prepare(`
      INSERT INTO pipeline_activities (pipeline_id, activity_type, title, content, contact_method, outcome, next_steps, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.params.id,
      activity_type,
      title || null,
      content,
      contact_method || null,
      outcome || null,
      next_steps || null,
      req.user.userId
    );

    const newActivity = db.prepare(`
      SELECT a.*, u.name as created_by_name
      FROM pipeline_activities a
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(newActivity);
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

// Delete activity
router.delete('/:id/activities/:activityId', auth, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM pipeline_activities WHERE id = ? AND pipeline_id = ?')
      .run(req.params.activityId, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json({ message: 'Activity deleted successfully' });
  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

module.exports = router;
