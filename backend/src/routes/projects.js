const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

// Apply auth to all routes
router.use(authenticateToken);

// Get all projects
router.get('/', (req, res) => {
  try {
    const { search, status, company_id, client_id, priority, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT p.*, 
             comp.name as company_name,
             c.first_name || ' ' || c.last_name as client_name
      FROM projects p
      LEFT JOIN companies comp ON p.company_id = comp.id
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    if (company_id) {
      query += ' AND p.company_id = ?';
      params.push(company_id);
    }

    if (client_id) {
      query += ' AND p.client_id = ?';
      params.push(client_id);
    }

    if (priority) {
      query += ' AND p.priority = ?';
      params.push(priority);
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const projects = db.prepare(query).all(...params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM projects p WHERE 1=1';
    const countParams = [];
    if (search) {
      countQuery += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm);
    }
    if (status) {
      countQuery += ' AND p.status = ?';
      countParams.push(status);
    }
    if (company_id) {
      countQuery += ' AND p.company_id = ?';
      countParams.push(company_id);
    }
    if (client_id) {
      countQuery += ' AND p.client_id = ?';
      countParams.push(client_id);
    }
    if (priority) {
      countQuery += ' AND p.priority = ?';
      countParams.push(priority);
    }
    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({ projects, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get project statistics
router.get('/stats', (req, res) => {
  try {
    const stats = {
      byStatus: db.prepare(`
        SELECT status, COUNT(*) as count, SUM(budget) as total_budget
        FROM projects
        GROUP BY status
      `).all(),
      byPriority: db.prepare(`
        SELECT priority, COUNT(*) as count
        FROM projects
        GROUP BY priority
      `).all(),
      totalProjects: db.prepare('SELECT COUNT(*) as count FROM projects').get().count,
      totalBudget: db.prepare('SELECT SUM(budget) as total FROM projects').get().total || 0,
      totalHours: db.prepare('SELECT SUM(actual_hours) as total FROM projects').get().total || 0,
      overdueProjects: db.prepare(`
        SELECT COUNT(*) as count FROM projects 
        WHERE deadline < date('now') AND status NOT IN ('completed', 'cancelled')
      `).get().count
    };

    res.json(stats);
  } catch (error) {
    console.error('Get project stats error:', error);
    res.status(500).json({ error: 'Failed to fetch project statistics' });
  }
});

// Get single project
router.get('/:id', (req, res) => {
  try {
    const project = db.prepare(`
      SELECT p.*, 
             comp.name as company_name,
             c.first_name || ' ' || c.last_name as client_name,
             c.email as client_email
      FROM projects p
      LEFT JOIN companies comp ON p.company_id = comp.id
      LEFT JOIN clients c ON p.client_id = c.id
      WHERE p.id = ?
    `).get(req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get associated tasks
    const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY due_date ASC').all(req.params.id);
    
    // Get associated invoices
    const invoices = db.prepare('SELECT * FROM invoices WHERE project_id = ? ORDER BY created_at DESC').all(req.params.id);
    
    // Get associated notes
    const notes = db.prepare('SELECT * FROM notes WHERE project_id = ? ORDER BY created_at DESC').all(req.params.id);

    res.json({ ...project, tasks, invoices, notes });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create project
router.post('/', [
  body('name').trim().notEmpty().withMessage('Project name is required'),
  body('status').optional().isIn(['proposal', 'approved', 'in_progress', 'on_hold', 'completed', 'cancelled']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { 
    company_id, client_id, name, description, status = 'proposal', project_type,
    budget, estimated_hours, hourly_rate, start_date, end_date, deadline, 
    priority = 'medium', notes 
  } = req.body;

  try {
    // Verify company exists if provided
    if (company_id) {
      const company = db.prepare('SELECT id FROM companies WHERE id = ?').get(company_id);
      if (!company) {
        return res.status(400).json({ error: 'Company not found' });
      }
    }

    // Verify client exists if provided
    if (client_id) {
      const client = db.prepare('SELECT id FROM clients WHERE id = ?').get(client_id);
      if (!client) {
        return res.status(400).json({ error: 'Client not found' });
      }
    }

    const result = db.prepare(`
      INSERT INTO projects (
        company_id, client_id, name, description, status, project_type,
        budget, estimated_hours, hourly_rate, start_date, end_date, deadline,
        priority, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      company_id, client_id, name, description, status, project_type,
      budget, estimated_hours, hourly_rate, start_date, end_date, deadline,
      priority, notes
    );

    const project = db.prepare(`
      SELECT p.*, comp.name as company_name
      FROM projects p
      LEFT JOIN companies comp ON p.company_id = comp.id
      WHERE p.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ message: 'Project created successfully', project });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project
router.put('/:id', (req, res) => {
  const { 
    company_id, client_id, name, description, status, project_type,
    budget, estimated_hours, actual_hours, hourly_rate, start_date, end_date, 
    deadline, priority, notes 
  } = req.body;

  try {
    const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    db.prepare(`
      UPDATE projects 
      SET company_id = COALESCE(?, company_id),
          client_id = COALESCE(?, client_id),
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          status = COALESCE(?, status),
          project_type = COALESCE(?, project_type),
          budget = COALESCE(?, budget),
          estimated_hours = COALESCE(?, estimated_hours),
          actual_hours = COALESCE(?, actual_hours),
          hourly_rate = COALESCE(?, hourly_rate),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          deadline = COALESCE(?, deadline),
          priority = COALESCE(?, priority),
          notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      company_id, client_id, name, description, status, project_type,
      budget, estimated_hours, actual_hours, hourly_rate, start_date, end_date,
      deadline, priority, notes, req.params.id
    );

    const project = db.prepare(`
      SELECT p.*, comp.name as company_name
      FROM projects p
      LEFT JOIN companies comp ON p.company_id = comp.id
      WHERE p.id = ?
    `).get(req.params.id);

    res.json({ message: 'Project updated successfully', project });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Log hours to project
router.post('/:id/hours', [
  body('hours').isNumeric().withMessage('Hours must be a number')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { hours } = req.body;

  try {
    const project = db.prepare('SELECT actual_hours FROM projects WHERE id = ?').get(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const newHours = (project.actual_hours || 0) + parseFloat(hours);

    db.prepare(`
      UPDATE projects 
      SET actual_hours = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newHours, req.params.id);

    res.json({ message: 'Hours logged successfully', actual_hours: newHours });
  } catch (error) {
    console.error('Log hours error:', error);
    res.status(500).json({ error: 'Failed to log hours' });
  }
});

// Delete project
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Project not found' });
    }

    db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;
