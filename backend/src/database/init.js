require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../database/crm.db');

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  console.log('📁 Creating database directory:', dbDir);
  fs.mkdirSync(dbDir, { recursive: true });
}

console.log('🔧 Database path:', dbPath);
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('🔧 Initializing database...');

// Create tables
db.exec(`
  -- Users table for authentication
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Companies table
  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    website TEXT,
    industry TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    country TEXT,
    phone TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Clients (contacts) table
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    position TEXT,
    is_primary_contact INTEGER DEFAULT 0,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
  );

  -- Projects table
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER,
    client_id INTEGER,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'proposal',
    project_type TEXT,
    budget REAL,
    estimated_hours REAL,
    actual_hours REAL DEFAULT 0,
    hourly_rate REAL,
    start_date DATE,
    end_date DATE,
    deadline DATE,
    priority TEXT DEFAULT 'medium',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
  );

  -- Invoices table
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    company_id INTEGER,
    invoice_number TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'draft',
    issue_date DATE,
    due_date DATE,
    subtotal REAL DEFAULT 0,
    tax_rate REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    total REAL DEFAULT 0,
    amount_paid REAL DEFAULT 0,
    notes TEXT,
    terms TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
  );

  -- Invoice line items
  CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity REAL DEFAULT 1,
    unit_price REAL DEFAULT 0,
    amount REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
  );

  -- Payments table
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    payment_date DATE NOT NULL,
    payment_method TEXT,
    reference TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
  );

  -- Leads table
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT,
    contact_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    website TEXT,
    source TEXT,
    status TEXT DEFAULT 'new',
    estimated_value REAL,
    probability INTEGER DEFAULT 50,
    notes TEXT,
    next_follow_up DATE,
    assigned_to INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
  );

  -- Tasks table
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    client_id INTEGER,
    lead_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    due_date DATE,
    completed_at DATETIME,
    assigned_to INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
  );

  -- Notes table (for communication history)
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    company_id INTEGER,
    project_id INTEGER,
    lead_id INTEGER,
    title TEXT,
    content TEXT NOT NULL,
    note_type TEXT DEFAULT 'general',
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  );

  -- Activity log for tracking changes
  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    entity_type TEXT NOT NULL,
    entity_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  -- Create indexes for better performance
  CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_id);
  CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
  CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
  CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
  CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
  CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
  CREATE INDEX IF NOT EXISTS idx_invoices_project ON invoices(project_id);
  CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
  CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
  CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
  CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
  CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
  CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
  CREATE INDEX IF NOT EXISTS idx_notes_client ON notes(client_id);
  CREATE INDEX IF NOT EXISTS idx_notes_project ON notes(project_id);
  CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
  CREATE INDEX IF NOT EXISTS idx_notes_created_by ON notes(created_by);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

  -- Pipeline (Sales Pipeline / Opportunities)
  CREATE TABLE IF NOT EXISTS pipeline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    company_name TEXT NOT NULL,
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    deal_name TEXT NOT NULL,
    deal_value REAL DEFAULT 0,
    stage TEXT DEFAULT 'qualification',
    probability INTEGER DEFAULT 20,
    expected_close_date DATE,
    source TEXT,
    notes TEXT,
    assigned_to INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_pipeline_stage ON pipeline(stage);
  CREATE INDEX IF NOT EXISTS idx_pipeline_assigned ON pipeline(assigned_to);

  -- Pipeline Activities (Conversation Log)
  CREATE TABLE IF NOT EXISTS pipeline_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pipeline_id INTEGER NOT NULL,
    activity_type TEXT DEFAULT 'note',
    title TEXT,
    content TEXT NOT NULL,
    contact_method TEXT,
    outcome TEXT,
    next_steps TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pipeline_id) REFERENCES pipeline(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_pipeline_activities ON pipeline_activities(pipeline_id);

  -- Universal Conversation Log (follows contact across lead → pipeline → client)
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER,
    pipeline_id INTEGER,
    client_id INTEGER,
    company_id INTEGER,
    activity_type TEXT DEFAULT 'note',
    title TEXT,
    content TEXT NOT NULL,
    contact_method TEXT,
    outcome TEXT,
    next_steps TEXT,
    follow_up_date DATE,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
    FOREIGN KEY (pipeline_id) REFERENCES pipeline(id) ON DELETE SET NULL,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_conversations_lead ON conversations(lead_id);
  CREATE INDEX IF NOT EXISTS idx_conversations_pipeline ON conversations(pipeline_id);
  CREATE INDEX IF NOT EXISTS idx_conversations_client ON conversations(client_id);
  CREATE INDEX IF NOT EXISTS idx_conversations_company ON conversations(company_id);
`);

// Create admin user from environment variables (if provided)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin User';

if (ADMIN_EMAIL && ADMIN_PASSWORD) {
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(ADMIN_EMAIL);

  if (!existingAdmin) {
    const hashedPassword = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    db.prepare(`
      INSERT INTO users (email, password, name, role)
      VALUES (?, ?, ?, ?)
    `).run(ADMIN_EMAIL, hashedPassword, ADMIN_NAME, 'admin');
    console.log(`✅ Admin user created (${ADMIN_EMAIL})`);
  } else {
    console.log(`ℹ️  Admin user already exists (${ADMIN_EMAIL})`);
  }
} else {
  console.log('⚠️  No admin credentials provided. Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables to create admin user.');
}

console.log('✅ Database initialized successfully!');

// Add missing columns to existing tables (for schema evolution)
try {
  db.exec(`ALTER TABLE invoices ADD COLUMN status TEXT DEFAULT 'draft';`);
  console.log('✅ Added status column to invoices');
} catch (e) {
  // column already exists
}

try {
  db.exec(`ALTER TABLE invoices ADD COLUMN amount_paid REAL DEFAULT 0;`);
  console.log('✅ Added amount_paid column to invoices');
} catch (e) {
  // column already exists
}

db.close();
