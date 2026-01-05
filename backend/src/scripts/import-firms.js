const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Read CSV file
const csvPath = '/Users/reeceway/Downloads/The Play Book - Firms (1).csv';
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV (handling quoted fields with commas)
function parseCSV(content) {
  const lines = [];
  let currentLine = '';
  let inQuotes = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
      currentLine += char;
    } else if (char === '\n' && !inQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = '';
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine);
  }
  
  return lines.map(line => {
    const fields = [];
    let field = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(field.trim());
        field = '';
      } else {
        field += char;
      }
    }
    fields.push(field.trim());
    return fields;
  });
}

const rows = parseCSV(csvContent);
const headers = rows[0];
const data = rows.slice(1);

console.log('Headers:', headers);
console.log(`Found ${data.length} firms to import\n`);

// Connect to database
const dbPath = path.join(__dirname, '../../database/crm.db');
console.log('Database path:', dbPath);
const db = new Database(dbPath);

// Prepare statements
const insertCompany = db.prepare(`
  INSERT INTO companies (name, website, address, industry, notes, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);

const insertLead = db.prepare(`
  INSERT INTO leads (contact_name, company_name, website, source, status, notes, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);

let companiesImported = 0;
let leadsImported = 0;
let skipped = 0;

// Import each firm
for (const row of data) {
  const firmName = row[0];  // Firm Name
  const targetContact = row[1];  // Target Contact
  const website = row[3];  // Website
  const address = row[4];  // Address
  const suite = row[5];  // Suite/Floor
  const city = row[6];  // City
  const state = row[7];  // State
  const zip = row[8];  // Zip
  const category = row[9];  // Category
  const notes = row[14];  // Notes (SEO audit info)
  
  if (!firmName || firmName === 'Firm Name') {
    skipped++;
    continue;
  }
  
  // Build full address
  const fullAddress = [address, suite, city, state, zip]
    .filter(Boolean)
    .join(', ');
  
  // Clean website URL
  let cleanWebsite = website;
  if (website && !website.startsWith('http')) {
    cleanWebsite = `https://${website}`;
  }
  
  try {
    // Insert as company
    insertCompany.run(
      firmName,
      cleanWebsite || null,
      fullAddress || null,
      category || 'Legal',
      notes || null
    );
    companiesImported++;
    
    // Also insert as lead with contact info
    if (targetContact) {
      insertLead.run(
        targetContact,
        firmName,
        cleanWebsite || null,
        'CSV Import - The Play Book',
        'new',
        notes || null
      );
      leadsImported++;
    }
    
    console.log(`✓ Imported: ${firmName}`);
  } catch (err) {
    console.log(`✗ Error importing ${firmName}: ${err.message}`);
    skipped++;
  }
}

db.close();

console.log('\n========================================');
console.log(`✅ Companies imported: ${companiesImported}`);
console.log(`✅ Leads imported: ${leadsImported}`);
console.log(`⚠️  Skipped: ${skipped}`);
console.log('========================================');
