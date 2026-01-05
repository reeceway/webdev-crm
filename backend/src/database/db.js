const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || './database/crm.db';
const db = new Database(path.resolve(__dirname, '../../', dbPath));

// Enable foreign keys
db.pragma('foreign_keys = ON');

module.exports = db;
