const fs = require('fs');
const path = require('path');
const db = require('../backend/src/database/db.js');

const csvPath = process.argv[2] || '/Users/reeceway/Downloads/The Play Book - Firms (1).csv';
const csv = fs.readFileSync(csvPath, 'utf-8');
const lines = csv.split('\n').filter(l => l.trim());

console.log('Total lines:', lines.length);

let imported = 0;
let skipped = 0;

// Parse CSV properly handling quoted fields with commas
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

for (let i = 1; i < lines.length; i++) {
  const values = parseCSVLine(lines[i]);
  const firmName = values[0]?.trim();
  const contact = values[1]?.trim();
  const website = values[3]?.trim();
  const address = values[4]?.trim();
  const suite = values[5]?.trim();
  const city = values[6]?.trim();
  const state = values[7]?.trim();
  const zip = values[8]?.trim();
  const category = values[9]?.trim();
  const notes = values[14]?.trim() || '';
  
  // Skip header row and rows that look like notes (start with [)
  if (!firmName || firmName === 'Firm Name' || firmName.startsWith('[')) {
    skipped++;
    continue;
  }
  
  const fullAddress = [address, suite, city, state, zip].filter(Boolean).join(', ');
  
  try {
    db.prepare(`
      INSERT OR REPLACE INTO leads (company_name, contact_name, website, email, phone, source, status, estimated_value, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'new', 5000, ?, datetime('now'))
    `).run(
      firmName,
      contact || '',
      website || '',
      '',
      '',
      category || 'CSV Import',
      fullAddress ? fullAddress + '\n' + notes : notes
    );
    imported++;
    console.log('✓', firmName);
  } catch (e) {
    console.log('✗', firmName + ':', e.message);
    skipped++;
  }
}

console.log('\n--- Summary ---');
console.log('Imported:', imported);
console.log('Skipped:', skipped);
console.log('Total leads in DB:', db.prepare('SELECT COUNT(*) as c FROM leads').get().c);
