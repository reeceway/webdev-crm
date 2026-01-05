const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

// Apply auth to all routes
router.use(authenticateToken);

// Get all clients
router.get('/', (req, res) => {
  try {
    const { search, company_id, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT c.*, comp.name as company_name 
      FROM clients c
      LEFT JOIN companies comp ON c.company_id = comp.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (company_id) {
      query += ' AND c.company_id = ?';
      params.push(company_id);
    }

    query += ' ORDER BY c.last_name, c.first_name ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const clients = db.prepare(query).all(...params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM clients c WHERE 1=1';
    const countParams = [];
    if (search) {
      countQuery += ' AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    if (company_id) {
      countQuery += ' AND c.company_id = ?';
      countParams.push(company_id);
    }
    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({ clients, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// Get single client
router.get('/:id', (req, res) => {
  try {
    const client = db.prepare(`
      SELECT c.*, comp.name as company_name 
      FROM clients c
      LEFT JOIN companies comp ON c.company_id = comp.id
      WHERE c.id = ?
    `).get(req.params.id);
    
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get associated projects
    const projects = db.prepare('SELECT * FROM projects WHERE client_id = ?').all(req.params.id);
    
    // Get associated notes
    const notes = db.prepare('SELECT * FROM notes WHERE client_id = ? ORDER BY created_at DESC').all(req.params.id);
    
    // Get associated tasks
    const tasks = db.prepare('SELECT * FROM tasks WHERE client_id = ?').all(req.params.id);

    res.json({ ...client, projects, notes, tasks });
  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

// Create client
router.post('/', [
  body('first_name').trim().notEmpty().withMessage('First name is required'),
  body('last_name').trim().notEmpty().withMessage('Last name is required'),
  body('email').optional().isEmail().withMessage('Invalid email format')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { 
    company_id, first_name, last_name, email, phone, 
    position, is_primary_contact, address, city, state, zip, notes 
  } = req.body;

  try {
    // Verify company exists if provided
    if (company_id) {
      const company = db.prepare('SELECT id FROM companies WHERE id = ?').get(company_id);
      if (!company) {
        return res.status(400).json({ error: 'Company not found' });
      }
    }

    const result = db.prepare(`
      INSERT INTO clients (company_id, first_name, last_name, email, phone, position, is_primary_contact, address, city, state, zip, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(company_id, first_name, last_name, email, phone, position, is_primary_contact ? 1 : 0, address, city, state, zip, notes);

    const client = db.prepare(`
      SELECT c.*, comp.name as company_name 
      FROM clients c
      LEFT JOIN companies comp ON c.company_id = comp.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ message: 'Client created successfully', client });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// Update client
router.put('/:id', (req, res) => {
  const { 
    company_id, first_name, last_name, email, phone, 
    position, is_primary_contact, address, city, state, zip, notes 
  } = req.body;

  try {
    const existing = db.prepare('SELECT id FROM clients WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Verify company exists if provided
    if (company_id) {
      const company = db.prepare('SELECT id FROM companies WHERE id = ?').get(company_id);
      if (!company) {
        return res.status(400).json({ error: 'Company not found' });
      }
    }

    db.prepare(`
      UPDATE clients 
      SET company_id = COALESCE(?, company_id),
          first_name = COALESCE(?, first_name),
          last_name = COALESCE(?, last_name),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          position = COALESCE(?, position),
          is_primary_contact = COALESCE(?, is_primary_contact),
          address = COALESCE(?, address),
          city = COALESCE(?, city),
          state = COALESCE(?, state),
          zip = COALESCE(?, zip),
          notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(company_id, first_name, last_name, email, phone, position, 
           is_primary_contact !== undefined ? (is_primary_contact ? 1 : 0) : undefined, 
           address, city, state, zip, notes, req.params.id);

    const client = db.prepare(`
      SELECT c.*, comp.name as company_name 
      FROM clients c
      LEFT JOIN companies comp ON c.company_id = comp.id
      WHERE c.id = ?
    `).get(req.params.id);

    res.json({ message: 'Client updated successfully', client });
  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

// Delete client
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM clients WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Client not found' });
    }

    db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);

    res.json({ message: 'Client deleted successfully' });
  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

module.exports = router;
