require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const logger = require('./utils/logger');

// Initialize database on startup if it doesn't exist
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../database/crm.db');
logger.info('Database path configured', { dbPath });

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  logger.info('Creating database directory', { dbDir });
  fs.mkdirSync(dbDir, { recursive: true });
}

if (!fs.existsSync(dbPath)) {
  logger.info('Database not found, initializing...', { dbPath });
  require('./database/init');
} else {
  logger.info('Database found', { dbPath });
}

// Run database migrations
const Database = require('better-sqlite3');
const db = new Database(dbPath);
try {
  db.exec(`ALTER TABLE invoices ADD COLUMN status TEXT DEFAULT 'draft';`);
  logger.info('Added status column to invoices');
} catch (e) {
  // column already exists
}
try {
  db.exec(`ALTER TABLE invoices ADD COLUMN amount_paid REAL DEFAULT 0;`);
  logger.info('Added amount_paid column to invoices');
} catch (e) {
  // column already exists
}
db.close();

// Import routes
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const companyRoutes = require('./routes/companies');
const projectRoutes = require('./routes/projects');
const invoiceRoutes = require('./routes/invoices');
const leadRoutes = require('./routes/leads');
const pipelineRoutes = require('./routes/pipeline');
const conversationRoutes = require('./routes/conversations');
const taskRoutes = require('./routes/tasks');
const noteRoutes = require('./routes/notes');
const dashboardRoutes = require('./routes/dashboard');
const auditRoutes = require('./routes/audit');
const placesRoutes = require('./routes/places');

const app = express();
const PORT = process.env.PORT || 3001;

// Request logging middleware (before other middleware)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });
  next();
});

// CORS configuration - restrict to specific origins in production
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true,
  optionsSuccessStatus: 200
};

// Rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Add payload size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes with rate limiting
app.use('/api/auth', authLimiter, authRoutes); // Stricter rate limit for auth
app.use('/api/clients', apiLimiter, clientRoutes);
app.use('/api/companies', apiLimiter, companyRoutes);
app.use('/api/projects', apiLimiter, projectRoutes);
app.use('/api/invoices', apiLimiter, invoiceRoutes);
app.use('/api/leads', apiLimiter, leadRoutes);
app.use('/api/pipeline', apiLimiter, pipelineRoutes);
app.use('/api/conversations', apiLimiter, conversationRoutes);
app.use('/api/tasks', apiLimiter, taskRoutes);
app.use('/api/notes', apiLimiter, noteRoutes);
app.use('/api/dashboard', apiLimiter, dashboardRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/places', placesRoutes);

// Health check
app.get('/api/health', (req, res) => {
  const dbExists = fs.existsSync(dbPath);
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    database: dbExists ? 'connected' : 'missing',
  };
  logger.debug('Health check requested', health);
  res.json(health);
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));
  
  // Handle client-side routing - serve index.html for non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', err, {
    method: req.method,
    path: req.path,
    body: req.body,
  });
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  logger.info('WebDev CRM API started', {
    port: PORT,
    env: process.env.NODE_ENV,
    nodeVersion: process.version,
  });
});

module.exports = app;
