#!/bin/sh
# Railway Startup Script - Ensures database is ready before starting Node.js

echo "🔧 Railway Startup Script"
echo "========================="

# Get database path from environment or use default
DB_PATH="${DATABASE_PATH:-/app/data/crm.db}"
DB_DIR=$(dirname "$DB_PATH")

echo "Database path: $DB_PATH"
echo "Database directory: $DB_DIR"

# Ensure database directory exists
if [ ! -d "$DB_DIR" ]; then
    echo "📁 Creating database directory: $DB_DIR"
    mkdir -p "$DB_DIR"
fi

# Check if old/corrupted database exists
if [ -f "$DB_PATH" ]; then
    echo "⚠️  Found existing database file"
    
    # Backup the old database
    BACKUP_PATH="${DB_PATH}.old-$(date +%s)"
    echo "📦 Backing up to: $BACKUP_PATH"
    mv "$DB_PATH" "$BACKUP_PATH"
    
    echo "✅ Old database backed up"
    echo "✅ Database will be recreated on startup"
else
    echo "ℹ️  No existing database file found"
fi

echo ""
echo "✅ Environment ready - starting application..."
echo ""

# Start the Node.js application
exec node src/index.js
