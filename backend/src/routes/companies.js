const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

// Apply auth to all routes
router.use(authenticateToken);

// Get all companies
router.get('/', (req, res) => {
  try {
    const { search, industry, limit = 50, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM companies WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (name LIKE ? OR website LIKE ? OR city LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (industry) {
      query += ' AND industry = ?';
      params.push(industry);
    }

    query += ' ORDER BY name ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const companies = db.prepare(query).all(...params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM companies WHERE 1=1';
    const countParams = [];
    if (search) {
      countQuery += ' AND (name LIKE ? OR website LIKE ? OR city LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    if (industry) {
      countQuery += ' AND industry = ?';
      countParams.push(industry);
    }
    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({ companies, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('Get companies error:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Get single company
router.get('/:id', (req, res) => {
  try {
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
    
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Get associated clients
    const clients = db.prepare('SELECT * FROM clients WHERE company_id = ?').all(req.params.id);
    
    // Get associated projects
    const projects = db.prepare('SELECT * FROM projects WHERE company_id = ?').all(req.params.id);

    res.json({ ...company, clients, projects });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
});

// Create company
router.post('/', [
  body('name').trim().notEmpty().withMessage('Company name is required')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, website, industry, address, city, state, zip, country, phone, notes } = req.body;

  try {
    const result = db.prepare(`
      INSERT INTO companies (name, website, industry, address, city, state, zip, country, phone, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, website, industry, address, city, state, zip, country, phone, notes);

    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ message: 'Company created successfully', company });
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({ error: 'Failed to create company' });
  }
});

// Update company
router.put('/:id', (req, res) => {
  const { name, website, industry, address, city, state, zip, country, phone, notes } = req.body;

  try {
    const existing = db.prepare('SELECT id FROM companies WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Company not found' });
    }

    db.prepare(`
      UPDATE companies 
      SET name = COALESCE(?, name),
          website = COALESCE(?, website),
          industry = COALESCE(?, industry),
          address = COALESCE(?, address),
          city = COALESCE(?, city),
          state = COALESCE(?, state),
          zip = COALESCE(?, zip),
          country = COALESCE(?, country),
          phone = COALESCE(?, phone),
          notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, website, industry, address, city, state, zip, country, phone, notes, req.params.id);

    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);

    res.json({ message: 'Company updated successfully', company });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({ error: 'Failed to update company' });
  }
});

// Delete company
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM companies WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Company not found' });
    }

    db.prepare('DELETE FROM companies WHERE id = ?').run(req.params.id);

    res.json({ message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  }
});

module.exports = router;
