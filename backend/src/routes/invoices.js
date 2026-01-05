const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

// Apply auth to all routes
router.use(authenticateToken);

// Generate invoice number
const generateInvoiceNumber = () => {
  const year = new Date().getFullYear();
  const lastInvoice = db.prepare(`
    SELECT invoice_number FROM invoices 
    WHERE invoice_number LIKE ?
    ORDER BY id DESC LIMIT 1
  `).get(`INV-${year}-%`);

  let nextNumber = 1;
  if (lastInvoice) {
    const lastNumber = parseInt(lastInvoice.invoice_number.split('-')[2]);
    nextNumber = lastNumber + 1;
  }

  return `INV-${year}-${String(nextNumber).padStart(4, '0')}`;
};

// Get all invoices
router.get('/', (req, res) => {
  try {
    const { search, status, company_id, project_id, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT i.*, 
             comp.name as company_name,
             p.name as project_name
      FROM invoices i
      LEFT JOIN companies comp ON i.company_id = comp.id
      LEFT JOIN projects p ON i.project_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ' AND (i.invoice_number LIKE ? OR comp.name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (status) {
      query += ' AND i.status = ?';
      params.push(status);
    }

    if (company_id) {
      query += ' AND i.company_id = ?';
      params.push(company_id);
    }

    if (project_id) {
      query += ' AND i.project_id = ?';
      params.push(project_id);
    }

    query += ' ORDER BY i.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const invoices = db.prepare(query).all(...params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM invoices i WHERE 1=1';
    const countParams = [];
    if (search) {
      countQuery += ' AND i.invoice_number LIKE ?';
      countParams.push(`%${search}%`);
    }
    if (status) {
      countQuery += ' AND i.status = ?';
      countParams.push(status);
    }
    if (company_id) {
      countQuery += ' AND i.company_id = ?';
      countParams.push(company_id);
    }
    if (project_id) {
      countQuery += ' AND i.project_id = ?';
      countParams.push(project_id);
    }
    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({ invoices, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get invoice statistics
router.get('/stats', (req, res) => {
  try {
    const stats = {
      byStatus: db.prepare(`
        SELECT status, COUNT(*) as count, SUM(total) as total_amount
        FROM invoices
        GROUP BY status
      `).all(),
      totalInvoiced: db.prepare('SELECT SUM(total) as total FROM invoices').get().total || 0,
      totalPaid: db.prepare('SELECT SUM(amount_paid) as total FROM invoices').get().total || 0,
      totalOutstanding: db.prepare(`
        SELECT SUM(total - amount_paid) as total FROM invoices 
        WHERE status NOT IN ('paid', 'cancelled')
      `).get().total || 0,
      overdueInvoices: db.prepare(`
        SELECT COUNT(*) as count, SUM(total - amount_paid) as total
        FROM invoices 
        WHERE due_date < date('now') AND status NOT IN ('paid', 'cancelled')
      `).get()
    };

    res.json(stats);
  } catch (error) {
    console.error('Get invoice stats error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice statistics' });
  }
});

// Get single invoice
router.get('/:id', (req, res) => {
  try {
    const invoice = db.prepare(`
      SELECT i.*, 
             comp.name as company_name,
             comp.address as company_address,
             comp.city as company_city,
             comp.state as company_state,
             comp.zip as company_zip,
             p.name as project_name
      FROM invoices i
      LEFT JOIN companies comp ON i.company_id = comp.id
      LEFT JOIN projects p ON i.project_id = p.id
      WHERE i.id = ?
    `).get(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Get line items
    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(req.params.id);
    
    // Get payments
    const payments = db.prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC').all(req.params.id);

    res.json({ ...invoice, items, payments });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Create invoice
router.post('/', [
  body('company_id').optional().isInt(),
  body('status').optional().isIn(['draft', 'sent', 'paid', 'overdue', 'cancelled'])
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { 
    project_id, company_id, status = 'draft', issue_date, due_date,
    tax_rate = 0, discount = 0, notes, terms, items = []
  } = req.body;

  try {
    const invoice_number = generateInvoiceNumber();

    // Calculate totals from items
    let subtotal = 0;
    items.forEach(item => {
      subtotal += (item.quantity || 1) * (item.unit_price || 0);
    });

    const tax_amount = subtotal * (tax_rate / 100);
    const total = subtotal + tax_amount - discount;

    const result = db.prepare(`
      INSERT INTO invoices (
        project_id, company_id, invoice_number, status, issue_date, due_date,
        subtotal, tax_rate, tax_amount, discount, total, notes, terms
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      project_id, company_id, invoice_number, status, issue_date, due_date,
      subtotal, tax_rate, tax_amount, discount, total, notes, terms
    );

    const invoiceId = result.lastInsertRowid;

    // Insert line items
    const insertItem = db.prepare(`
      INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount)
      VALUES (?, ?, ?, ?, ?)
    `);

    items.forEach(item => {
      const amount = (item.quantity || 1) * (item.unit_price || 0);
      insertItem.run(invoiceId, item.description, item.quantity || 1, item.unit_price || 0, amount);
    });

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    const invoiceItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoiceId);

    res.status(201).json({ 
      message: 'Invoice created successfully', 
      invoice: { ...invoice, items: invoiceItems }
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Update invoice
router.put('/:id', (req, res) => {
  const { 
    project_id, company_id, status, issue_date, due_date,
    tax_rate, discount, notes, terms, items
  } = req.body;

  try {
    const existing = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Recalculate if items provided
    let subtotal = existing.subtotal;
    let tax_amount = existing.tax_amount;
    let total = existing.total;

    if (items && items.length > 0) {
      // Delete existing items and recalculate
      db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(req.params.id);
      
      subtotal = 0;
      items.forEach(item => {
        subtotal += (item.quantity || 1) * (item.unit_price || 0);
      });

      const effectiveTaxRate = tax_rate !== undefined ? tax_rate : existing.tax_rate;
      const effectiveDiscount = discount !== undefined ? discount : existing.discount;
      
      tax_amount = subtotal * (effectiveTaxRate / 100);
      total = subtotal + tax_amount - effectiveDiscount;

      // Insert new items
      const insertItem = db.prepare(`
        INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, amount)
        VALUES (?, ?, ?, ?, ?)
      `);

      items.forEach(item => {
        const amount = (item.quantity || 1) * (item.unit_price || 0);
        insertItem.run(req.params.id, item.description, item.quantity || 1, item.unit_price || 0, amount);
      });
    }

    db.prepare(`
      UPDATE invoices 
      SET project_id = COALESCE(?, project_id),
          company_id = COALESCE(?, company_id),
          status = COALESCE(?, status),
          issue_date = COALESCE(?, issue_date),
          due_date = COALESCE(?, due_date),
          subtotal = ?,
          tax_rate = COALESCE(?, tax_rate),
          tax_amount = ?,
          discount = COALESCE(?, discount),
          total = ?,
          notes = COALESCE(?, notes),
          terms = COALESCE(?, terms),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      project_id, company_id, status, issue_date, due_date,
      subtotal, tax_rate, tax_amount, discount, total, notes, terms,
      req.params.id
    );

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    const invoiceItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(req.params.id);

    res.json({ message: 'Invoice updated successfully', invoice: { ...invoice, items: invoiceItems } });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// Add payment to invoice
router.post('/:id/payments', [
  body('amount').isNumeric().withMessage('Amount is required'),
  body('payment_date').notEmpty().withMessage('Payment date is required')
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { amount, payment_date, payment_method, reference, notes } = req.body;

  try {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Add payment
    const result = db.prepare(`
      INSERT INTO payments (invoice_id, amount, payment_date, payment_method, reference, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.params.id, amount, payment_date, payment_method, reference, notes);

    // Update invoice amount_paid
    const newAmountPaid = (invoice.amount_paid || 0) + parseFloat(amount);
    let newStatus = invoice.status;

    if (newAmountPaid >= invoice.total) {
      newStatus = 'paid';
    }

    db.prepare(`
      UPDATE invoices 
      SET amount_paid = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newAmountPaid, newStatus, req.params.id);

    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ 
      message: 'Payment recorded successfully', 
      payment,
      invoice_status: newStatus,
      amount_paid: newAmountPaid
    });
  } catch (error) {
    console.error('Add payment error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Get payments for invoice
router.get('/:id/payments', (req, res) => {
  try {
    const invoice = db.prepare('SELECT id FROM invoices WHERE id = ?').get(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const payments = db.prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC').all(req.params.id);

    res.json({ payments });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Delete invoice
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM invoices WHERE id = ?').get(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Delete associated payments first (cascade should handle this, but being explicit)
    db.prepare('DELETE FROM payments WHERE invoice_id = ?').run(req.params.id);
    db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(req.params.id);
    db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);

    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

module.exports = router;
