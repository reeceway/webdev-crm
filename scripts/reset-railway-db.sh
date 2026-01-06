#!/bin/sh
# Railway Database Reset Script
# This script deletes the corrupted database file and lets the app recreate it

echo "🔧 Railway Database Reset Script"
echo "================================"

DB_PATH="${DATABASE_PATH:-/app/data/crm.db}"

echo "Database path: $DB_PATH"

if [ -f "$DB_PATH" ]; then
    echo "⚠️  Found existing database file"
    
    # Backup the old database
    BACKUP_PATH="${DB_PATH}.old-$(date +%s)"
    echo "📦 Backing up to: $BACKUP_PATH"
    mv "$DB_PATH" "$BACKUP_PATH"
    
    echo "✅ Old database backed up"
    echo "✅ Database will be recreated on next startup"
else
    echo "ℹ️  No existing database file found"
fi

echo ""
echo "Done! The application will create a fresh database on startup."
