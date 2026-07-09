const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'supabase-schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');

console.log('\n' + '='.repeat(80));
console.log('SUPABASE TABLE SETUP - COPY AND PASTE THIS SQL INTO SUPABASE DASHBOARD');
console.log('='.repeat(80) + '\n');

console.log('Steps:');
console.log('1. Go to: https://app.supabase.com');
console.log('2. Select project: zsxriivzjzdshvukmoqa');
console.log('3. Click: SQL Editor (left sidebar)');
console.log('4. Click: New Query');
console.log('5. Copy the SQL below and paste it');
console.log('6. Click: Run\n');

console.log('-'.repeat(80));
console.log('SQL TO RUN:\n');
console.log(schema);
console.log('\n' + '-'.repeat(80) + '\n');

console.log('After running this SQL:');
console.log('1. Return to terminal');
console.log('2. Run: npm run verify:supabase');
console.log('3. Start backend: npm run dev\n');
