const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

// Apply auth to all routes
router.use(authenticateToken);

// Get all tasks
router.get('/', (req, res) => {
  try {
    const { search, status, priority, project_id, client_id, lead_id, assigned_to, due_today, overdue, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT t.*, 
             u.name as assigned_to_name,
             p.name as project_name,
             c.first_name || ' ' || c.last_name as client_name,
             l.contact_name as lead_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN leads l ON t.lead_id = l.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (t.title LIKE ? OR t.description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    if (priority) {
      query += ' AND t.priority = ?';
      params.push(priority);
    }

    if (project_id) {
      query += ' AND t.project_id = ?';
      params.push(project_id);
    }

    if (client_id) {
      query += ' AND t.client_id = ?';
      params.push(client_id);
    }

    if (lead_id) {
      query += ' AND t.lead_id = ?';
      params.push(lead_id);
    }

    if (assigned_to) {
      query += ' AND t.assigned_to = ?';
      params.push(assigned_to);
    }

    if (due_today === 'true') {
      query += ' AND t.due_date = date("now")';
    }

    if (overdue === 'true') {
      query += ' AND t.due_date < date("now") AND t.status != "completed"';
    }

    query += ' ORDER BY t.due_date ASC, t.priority DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const tasks = db.prepare(query).all(...params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM tasks t WHERE 1=1';
    const countParams = [];
    if (search) {
      countQuery += ' AND (t.title LIKE ? OR t.description LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm);
    }
    if (status) {
      countQuery += ' AND t.status = ?';
      countParams.push(status);
    }
    if (priority) {
      countQuery += ' AND t.priority = ?';
      countParams.push(priority);
    }
    if (project_id) {
      countQuery += ' AND t.project_id = ?';
      countParams.push(project_id);
    }
    if (client_id) {
      countQuery += ' AND t.client_id = ?';
      countParams.push(client_id);
    }
    if (lead_id) {
      countQuery += ' AND t.lead_id = ?';
      countParams.push(lead_id);
    }
    if (assigned_to) {
      countQuery += ' AND t.assigned_to = ?';
      countParams.push(assigned_to);
    }
    if (due_today === 'true') {
      countQuery += ' AND t.due_date = date("now")';
    }
    if (overdue === 'true') {
      countQuery += ' AND t.due_date < date("now") AND t.status != "completed"';
    }
    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({ tasks, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get my tasks (assigned to current user)
router.get('/my', (req, res) => {
  try {
    const tasks = db.prepare(`
      SELECT t.*, 
             p.name as project_name,
             c.first_name || ' ' || c.last_name as client_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN clients c ON t.client_id = c.id
      WHERE t.assigned_to = ? AND t.status != 'completed'
      ORDER BY t.due_date ASC, t.priority DESC
    `).all(req.user.id);

    res.json({ tasks });
  } catch (error) {
    console.error('Get my tasks error:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Get task statistics
router.get('/stats', (req, res) => {
  try {
    const stats = {
      byStatus: db.prepare(`
        SELECT status, COUNT(*) as count
        FROM tasks
        GROUP BY status
      `).all(),
      byPriority: db.prepare(`
        SELECT priority, COUNT(*) as count
        FROM tasks
        WHERE status != 'completed'
        GROUP BY priority
      `).all(),
      totalTasks: db.prepare('SELECT COUNT(*) as count FROM tasks').get().count,
      completedTasks: db.prepare('SELECT COUNT(*) as count FROM tasks WHERE status = "completed"').get().count,
      pendingTasks: db.prepare('SELECT COUNT(*) as count FROM tasks WHERE status != "completed"').get().count,
      overdueTasks: db.prepare(`
        SELECT COUNT(*) as count FROM tasks 
        WHERE due_date < date('now') AND status != 'completed'
      `).get().count,
      dueToday: db.prepare(`
        SELECT COUNT(*) as count FROM tasks 
        WHERE due_date = date('now') AND status != 'completed'
      `).get().count,
      dueThisWeek: db.prepare(`
        SELECT COUNT(*) as count FROM tasks 
        WHERE due_date BETWEEN date('now') AND date('now', '+7 days') 
        AND status != 'completed'
      `).get().count
    };

    res.json(stats);
  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({ error: 'Failed to fetch task statistics' });
  }
});

// Get single task
router.get('/:id', (req, res) => {
  try {
    const task = db.prepare(`
      SELECT t.*, 
             u.name as assigned_to_name,
             p.name as project_name,
             c.first_name || ' ' || c.last_name as client_name,
             l.contact_name as lead_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN clients c ON t.client_id = c.id
      LEFT JOIN leads l ON t.lead_id = l.id
      WHERE t.id = ?
    `).get(req.params.id);
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// Create task
router.post('/', [
  body('title').trim().notEmpty().withMessage('Task title is required'),
  body('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { 
    project_id, client_id, lead_id, title, description,
    status = 'pending', priority = 'medium', due_date, assigned_to
  } = req.body;

  try {
    const result = db.prepare(`
      INSERT INTO tasks (
        project_id, client_id, lead_id, title, description,
        status, priority, due_date, assigned_to
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      project_id, client_id, lead_id, title, description,
      status, priority, due_date, assigned_to || req.user.id
    );

    const task = db.prepare(`
      SELECT t.*, u.name as assigned_to_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ message: 'Task created successfully', task });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.put('/:id', (req, res) => {
  const { 
    project_id, client_id, lead_id, title, description,
    status, priority, due_date, assigned_to
  } = req.body;

  try {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Set completed_at if status changed to completed
    let completed_at = existing.completed_at;
    if (status === 'completed' && existing.status !== 'completed') {
      completed_at = new Date().toISOString();
    } else if (status && status !== 'completed') {
      completed_at = null;
    }

    db.prepare(`
      UPDATE tasks 
      SET project_id = COALESCE(?, project_id),
          client_id = COALESCE(?, client_id),
          lead_id = COALESCE(?, lead_id),
          title = COALESCE(?, title),
          description = COALESCE(?, description),
          status = COALESCE(?, status),
          priority = COALESCE(?, priority),
          due_date = COALESCE(?, due_date),
          completed_at = ?,
          assigned_to = COALESCE(?, assigned_to),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      project_id, client_id, lead_id, title, description,
      status, priority, due_date, completed_at, assigned_to, req.params.id
    );

    const task = db.prepare(`
      SELECT t.*, u.name as assigned_to_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.id = ?
    `).get(req.params.id);

    res.json({ message: 'Task updated successfully', task });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Mark task as complete
router.post('/:id/complete', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    db.prepare(`
      UPDATE tasks 
      SET status = 'completed', 
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.params.id);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);

    res.json({ message: 'Task completed successfully', task });
  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

// Delete task
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Task not found' });
    }

    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
