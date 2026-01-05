#!/usr/bin/env node
const fs = require('fs');

// Configuration - UPDATE THESE
const RAILWAY_URL = process.env.RAILWAY_URL || 'https://YOUR-APP.up.railway.app';
const CSV_PATH = '/Users/reeceway/Downloads/The Play Book - Firms (1).csv';

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

async function importToRailway() {
  // Read and parse CSV
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCSV(csvContent);
  const headers = rows[0];
  const data = rows.slice(1);

  console.log('Headers:', headers);
  console.log(`Found ${data.length} firms to import\n`);

  // Map CSV columns
  const firmNameIdx = headers.findIndex(h => h.toLowerCase().includes('firm name'));
  const contactIdx = headers.findIndex(h => h.toLowerCase().includes('target contact'));
  const websiteIdx = headers.findIndex(h => h.toLowerCase().includes('website'));
  const addressIdx = headers.findIndex(h => h.toLowerCase().includes('address'));
  const cityIdx = headers.findIndex(h => h.toLowerCase().includes('city'));
  const stateIdx = headers.findIndex(h => h.toLowerCase().includes('state'));
  const categoryIdx = headers.findIndex(h => h.toLowerCase().includes('category'));
  const notesIdx = headers.findIndex(h => h.toLowerCase().includes('notes'));

  // Convert to leads format
  const leads = data.map(row => {
    const address = [row[addressIdx], row[cityIdx], row[stateIdx]].filter(Boolean).join(', ');
    return {
      company_name: row[firmNameIdx] || '',
      contact_name: row[contactIdx] || 'Unknown',
      website: row[websiteIdx] || null,
      source: row[categoryIdx] || 'import',
      status: 'new',
      estimated_value: 5000, // Default estimated value for law firms
      notes: `Address: ${address}\n${row[notesIdx] || ''}`
    };
  }).filter(l => l.company_name);

  console.log(`Prepared ${leads.length} leads for import`);

  // First, we need to register/login to get a token
  console.log('\nStep 1: Creating admin account...');
  
  try {
    const registerRes = await fetch(`${RAILWAY_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@webdevcrm.com',
        password: 'admin123',
        name: 'Admin'
      })
    });
    const registerData = await registerRes.json();
    console.log('Register result:', registerData.message || registerData.error || 'OK');
  } catch (e) {
    console.log('Register skipped (may already exist)');
  }

  // Login
  console.log('\nStep 2: Logging in...');
  const loginRes = await fetch(`${RAILWAY_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@webdevcrm.com',
      password: 'admin123'
    })
  });
  const loginData = await loginRes.json();
  
  if (!loginData.token) {
    console.error('Login failed:', loginData);
    process.exit(1);
  }
  
  console.log('Logged in successfully!');
  const token = loginData.token;

  // Import leads
  console.log('\nStep 3: Importing leads...');
  const importRes = await fetch(`${RAILWAY_URL}/api/leads/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ leads })
  });
  
  const importData = await importRes.json();
  console.log('\n✅ Import complete!');
  console.log(importData);
}

importToRailway().catch(console.error);
