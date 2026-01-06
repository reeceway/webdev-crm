const Database = require('better-sqlite3');
const path = require('path');
const logger = require('../utils/logger');

// Use DATABASE_PATH as absolute path if it starts with /, otherwise resolve relative to project
const dbPath = process.env.DATABASE_PATH || './database/crm.db';
const resolvedPath = dbPath.startsWith('/') ? dbPath : path.resolve(__dirname, '../../', dbPath);

let dbInstance = null;

// Lazy initialization - only connect when database is actually accessed
function getDb() {
    if (!dbInstance) {
        logger.info('Initializing database connection', { path: resolvedPath });
        dbInstance = new Database(resolvedPath);

        // Enable foreign keys
        dbInstance.pragma('foreign_keys = ON');

        logger.info('✅ Database connection initialized successfully');
    }
    return dbInstance;
}

// Export a Proxy that intercepts all property access and calls getDb() first
module.exports = new Proxy({}, {
    get: function (target, prop) {
        const db = getDb();
        const value = db[prop];

        // If it's a function, bind it to the db instance
        if (typeof value === 'function') {
            return value.bind(db);
        }

        return value;
    }
});

