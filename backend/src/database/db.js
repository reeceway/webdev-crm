const Database = require('better-sqlite3');
const path = require('path');

// Use DATABASE_PATH as absolute path if it starts with /, otherwise resolve relative to project
const dbPath = process.env.DATABASE_PATH || './database/crm.db';
const resolvedPath = dbPath.startsWith('/') ? dbPath : path.resolve(__dirname, '../../', dbPath);
const db = new Database(resolvedPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

module.exports = db;
