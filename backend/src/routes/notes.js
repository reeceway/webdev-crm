const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

// Apply auth to all routes
router.use(authenticateToken);

// Get all notes
router.get('/', (req, res) => {
  try {
    const { client_id, company_id, project_id, lead_id, note_type, search, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT n.*, 
             u.name as created_by_name,
             c.first_name || ' ' || c.last_name as client_name,
             comp.name as company_name,
             p.name as project_name,
             l.contact_name as lead_name
      FROM notes n
      LEFT JOIN users u ON n.created_by = u.id
      LEFT JOIN clients c ON n.client_id = c.id
      LEFT JOIN companies comp ON n.company_id = comp.id
      LEFT JOIN projects p ON n.project_id = p.id
      LEFT JOIN leads l ON n.lead_id = l.id
      WHERE 1=1
    `;
    const params = [];

    if (client_id) {
      query += ' AND n.client_id = ?';
      params.push(client_id);
    }

    if (company_id) {
      query += ' AND n.company_id = ?';
      params.push(company_id);
    }

    if (project_id) {
      query += ' AND n.project_id = ?';
      params.push(project_id);
    }

    if (lead_id) {
      query += ' AND n.lead_id = ?';
      params.push(lead_id);
    }

    if (note_type) {
      query += ' AND n.note_type = ?';
      params.push(note_type);
    }

    if (search) {
      query += ' AND (n.title LIKE ? OR n.content LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const notes = db.prepare(query).all(...params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM notes n WHERE 1=1';
    const countParams = [];
    if (client_id) {
      countQuery += ' AND n.client_id = ?';
      countParams.push(client_id);
    }
    if (company_id) {
      countQuery += ' AND n.company_id = ?';
      countParams.push(company_id);
    }
    if (project_id) {
      countQuery += ' AND n.project_id = ?';
      countParams.push(project_id);
    }
    if (lead_id) {
      countQuery += ' AND n.lead_id = ?';
      countParams.push(lead_id);
    }
    if (note_type) {
      countQuery += ' AND n.note_type = ?';
      countParams.push(note_type);
    }
    if (search) {
      countQuery += ' AND (n.title LIKE ? OR n.content LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm);
    }
    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({ notes, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Get single note
router.get('/:id', (req, res) => {
  try {
    const note = db.prepare(`
      SELECT n.*, 
             u.name as created_by_name,
             c.first_name || ' ' || c.last_name as client_name,
             comp.name as company_name,
             p.name as project_name,
             l.contact_name as lead_name
      FROM notes n
      LEFT JOIN users u ON n.created_by = u.id
      LEFT JOIN clients c ON n.client_id = c.id
      LEFT JOIN companies comp ON n.company_id = comp.id
      LEFT JOIN projects p ON n.project_id = p.id
      LEFT JOIN leads l ON n.lead_id = l.id
      WHERE n.id = ?
    `).get(req.params.id);
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json(note);
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

// Create note
router.post('/', [
  body('content').trim().notEmpty().withMessage('Note content is required'),
  body('note_type').optional().isIn(['general', 'call', 'email', 'meeting', 'followup'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { client_id, company_id, project_id, lead_id, title, content, note_type = 'general' } = req.body;

  try {
    const result = db.prepare(`
      INSERT INTO notes (client_id, company_id, project_id, lead_id, title, content, note_type, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(client_id, company_id, project_id, lead_id, title, content, note_type, req.user.id);

    const note = db.prepare(`
      SELECT n.*, u.name as created_by_name
      FROM notes n
      LEFT JOIN users u ON n.created_by = u.id
      WHERE n.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ message: 'Note created successfully', note });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Update note
router.put('/:id', (req, res) => {
  const { title, content, note_type } = req.body;

  try {
    const existing = db.prepare('SELECT id, created_by FROM notes WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Only allow creator to edit
    if (existing.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to edit this note' });
    }

    db.prepare(`
      UPDATE notes 
      SET title = COALESCE(?, title),
          content = COALESCE(?, content),
          note_type = COALESCE(?, note_type),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, content, note_type, req.params.id);

    const note = db.prepare(`
      SELECT n.*, u.name as created_by_name
      FROM notes n
      LEFT JOIN users u ON n.created_by = u.id
      WHERE n.id = ?
    `).get(req.params.id);

    res.json({ message: 'Note updated successfully', note });
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// Delete note
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id, created_by FROM notes WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Only allow creator or admin to delete
    if (existing.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this note' });
    }

    db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

module.exports = router;
