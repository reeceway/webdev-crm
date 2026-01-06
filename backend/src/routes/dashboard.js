const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

// Apply auth to all routes
router.use(authenticateToken);

// Get dashboard overview
router.get('/', (req, res) => {
  try {
    // Optimized: Single query with subqueries for all dashboard metrics
    const dashboard = db.prepare(`
      SELECT
        -- Summary counts
        (SELECT COUNT(*) FROM clients) as clients,
        (SELECT COUNT(*) FROM companies) as companies,
        (SELECT COUNT(*) FROM projects WHERE status = 'in_progress') as activeProjects,
        (SELECT COUNT(*) FROM leads WHERE status NOT IN ('won', 'lost')) as openLeads,
        (SELECT COUNT(*) FROM tasks WHERE status != 'completed') as pendingTasks,
        (SELECT COUNT(*) FROM invoices WHERE status NOT IN ('paid', 'cancelled')) as unpaidInvoices,

        -- Financial summary
        (SELECT COALESCE(SUM(amount_paid), 0) FROM invoices) as totalRevenue,
        (SELECT COALESCE(SUM(total - amount_paid), 0) FROM invoices WHERE status NOT IN ('paid', 'cancelled')) as pendingPayments,
        (SELECT COALESCE(SUM(total - amount_paid), 0) FROM invoices WHERE due_date < date('now') AND status NOT IN ('paid', 'cancelled')) as overdueAmount,
        (SELECT COALESCE(SUM(amount_paid), 0) FROM payments WHERE strftime('%Y-%m', payment_date) = strftime('%Y-%m', 'now')) as thisMonthRevenue,

        -- Pipeline value
        (SELECT COALESCE(SUM(estimated_value), 0) FROM leads WHERE status NOT IN ('won', 'lost')) as pipelineTotalValue,
        (SELECT COALESCE(SUM(estimated_value * probability / 100), 0) FROM leads WHERE status NOT IN ('won', 'lost')) as pipelineWeightedValue,
        (SELECT COALESCE(SUM(estimated_value), 0) FROM leads WHERE status = 'won' AND strftime('%Y-%m', updated_at) = strftime('%Y-%m', 'now')) as wonThisMonth,

        -- Urgent items
        (SELECT COUNT(*) FROM tasks WHERE due_date < date('now') AND status != 'completed') as overdueTasks,
        (SELECT COUNT(*) FROM tasks WHERE due_date = date('now') AND status != 'completed') as tasksDueToday,
        (SELECT COUNT(*) FROM invoices WHERE due_date < date('now') AND status NOT IN ('paid', 'cancelled')) as overdueInvoices,
        (SELECT COUNT(*) FROM leads WHERE next_follow_up < date('now') AND status NOT IN ('won', 'lost')) as overdueFollowUps
    `).get();

    // Structure the response
    const response = {
      counts: {
        clients: dashboard.clients,
        companies: dashboard.companies,
        activeProjects: dashboard.activeProjects,
        openLeads: dashboard.openLeads,
        pendingTasks: dashboard.pendingTasks,
        unpaidInvoices: dashboard.unpaidInvoices
      },
      financial: {
        totalRevenue: dashboard.totalRevenue,
        pendingPayments: dashboard.pendingPayments,
        overdueAmount: dashboard.overdueAmount,
        thisMonthRevenue: dashboard.thisMonthRevenue
      },
      pipeline: {
        totalValue: dashboard.pipelineTotalValue,
        weightedValue: dashboard.pipelineWeightedValue,
        wonThisMonth: dashboard.wonThisMonth
      },
      urgent: {
        overdueTasks: dashboard.overdueTasks,
        tasksDueToday: dashboard.tasksDueToday,
        overdueInvoices: dashboard.overdueInvoices,
        overdueFollowUps: dashboard.overdueFollowUps
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get recent activity
router.get('/activity', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    // Get recent notes as activity
    const recentNotes = db.prepare(`
      SELECT 
        'note' as type,
        n.id,
        n.title,
        n.note_type,
        n.created_at,
        u.name as user_name,
        COALESCE(c.first_name || ' ' || c.last_name, comp.name, p.name, l.contact_name) as related_to
      FROM notes n
      LEFT JOIN users u ON n.created_by = u.id
      LEFT JOIN clients c ON n.client_id = c.id
      LEFT JOIN companies comp ON n.company_id = comp.id
      LEFT JOIN projects p ON n.project_id = p.id
      LEFT JOIN leads l ON n.lead_id = l.id
      ORDER BY n.created_at DESC
      LIMIT ?
    `).all(limit);

    // Get recent projects
    const recentProjects = db.prepare(`
      SELECT 
        'project' as type,
        p.id,
        p.name as title,
        p.status,
        p.created_at,
        comp.name as company_name
      FROM projects p
      LEFT JOIN companies comp ON p.company_id = comp.id
      ORDER BY p.created_at DESC
      LIMIT ?
    `).all(limit);

    // Get recent leads
    const recentLeads = db.prepare(`
      SELECT 
        'lead' as type,
        id,
        contact_name as title,
        status,
        created_at,
        company_name
      FROM leads
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit);

    // Combine and sort by date
    const activity = [...recentNotes, ...recentProjects, ...recentLeads]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);

    res.json({ activity });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Get upcoming deadlines
router.get('/deadlines', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    const taskDeadlines = db.prepare(`
      SELECT 
        'task' as type,
        t.id,
        t.title,
        t.due_date,
        t.priority,
        p.name as project_name
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.due_date BETWEEN date('now') AND date('now', '+' || ? || ' days')
      AND t.status != 'completed'
      ORDER BY t.due_date ASC
    `).all(days);

    const projectDeadlines = db.prepare(`
      SELECT 
        'project' as type,
        id,
        name as title,
        deadline as due_date,
        priority,
        NULL as project_name
      FROM projects
      WHERE deadline BETWEEN date('now') AND date('now', '+' || ? || ' days')
      AND status NOT IN ('completed', 'cancelled')
      ORDER BY deadline ASC
    `).all(days);

    const invoiceDeadlines = db.prepare(`
      SELECT 
        'invoice' as type,
        i.id,
        i.invoice_number as title,
        i.due_date,
        'high' as priority,
        comp.name as company_name
      FROM invoices i
      LEFT JOIN companies comp ON i.company_id = comp.id
      WHERE i.due_date BETWEEN date('now') AND date('now', '+' || ? || ' days')
      AND i.status NOT IN ('paid', 'cancelled')
      ORDER BY i.due_date ASC
    `).all(days);

    const followUps = db.prepare(`
      SELECT 
        'followup' as type,
        id,
        contact_name as title,
        next_follow_up as due_date,
        'medium' as priority,
        company_name
      FROM leads
      WHERE next_follow_up BETWEEN date('now') AND date('now', '+' || ? || ' days')
      AND status NOT IN ('won', 'lost')
      ORDER BY next_follow_up ASC
    `).all(days);

    // Combine and sort by date
    const deadlines = [...taskDeadlines, ...projectDeadlines, ...invoiceDeadlines, ...followUps]
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    res.json({ deadlines });
  } catch (error) {
    console.error('Get deadlines error:', error);
    res.status(500).json({ error: 'Failed to fetch deadlines' });
  }
});

// Get revenue chart data
router.get('/revenue', (req, res) => {
  try {
    const months = parseInt(req.query.months) || 12;

    const revenueByMonth = db.prepare(`
      SELECT 
        strftime('%Y-%m', payment_date) as month,
        SUM(amount) as revenue
      FROM payments
      WHERE payment_date >= date('now', '-' || ? || ' months')
      GROUP BY strftime('%Y-%m', payment_date)
      ORDER BY month ASC
    `).all(months);

    const invoicedByMonth = db.prepare(`
      SELECT 
        strftime('%Y-%m', issue_date) as month,
        SUM(total) as invoiced
      FROM invoices
      WHERE issue_date >= date('now', '-' || ? || ' months')
      GROUP BY strftime('%Y-%m', issue_date)
      ORDER BY month ASC
    `).all(months);

    res.json({ revenueByMonth, invoicedByMonth });
  } catch (error) {
    console.error('Get revenue error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue data' });
  }
});

module.exports = router;
