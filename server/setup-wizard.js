#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '.env') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('CAMRENT SUPABASE SETUP WIZARD');
  console.log('='.repeat(70) + '\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env\n');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  console.log('📋 STEP 1: Checking for existing tables...\n');

  const tables = ['users', 'properties', 'favorites', 'inquiries'];
  let allExist = true;
  const tableStatus = {};

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*', { count: 'exact' }).limit(0);
      
      if (error && error.message.includes('not found')) {
        console.log(`   ❌ ${table}`);
        tableStatus[table] = false;
        allExist = false;
      } else if (error) {
        console.log(`   ⚠️  ${table} (error checking)`);
        tableStatus[table] = null;
      } else {
        console.log(`   ✅ ${table}`);
        tableStatus[table] = true;
      }
    } catch (err) {
      console.log(`   ⚠️  ${table}`);
      tableStatus[table] = null;
    }
  }

  console.log();

  if (allExist && Object.values(tableStatus).every(v => v === true)) {
    console.log('✅ All tables exist!\n');
    await insertSampleUser(supabase);
    rl.close();
    return;
  }

  console.log('⚠️  Some tables are missing.\n');
  console.log('📋 STEP 2: Create tables in Supabase Dashboard\n');

  const schemaPath = path.join(__dirname, 'supabase-schema.sql');
  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ Schema file not found: ${schemaPath}\n`);
    rl.close();
    process.exit(1);
  }
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  console.log('Follow these steps to create the tables:\n');
  console.log('1. Go to: https://app.supabase.com/project/zsxriivzjzdshvukmoqa');
  console.log('2. Click "SQL Editor" (left sidebar)');
  console.log('3. Click "+ New Query"');
  console.log('4. DELETE any existing text');
  console.log('5. COPY this entire SQL block (below):');
  console.log('\n' + '-'.repeat(70));
  console.log(schema);
  console.log('-'.repeat(70) + '\n');

  console.log('6. PASTE it into the SQL Editor');
  console.log('7. Click "Run" button (top right)');
  console.log('8. Wait for "Success" message');
  console.log('9. Return to this terminal\n');

  const ready = await question('Press ENTER after creating tables in Supabase: ');

  console.log('\n✓ Checking again...\n');

  let retries = 3;
  while (retries > 0) {
    let stillMissing = false;

    for (const table of tables) {
      if (tableStatus[table] === false) {
        try {
          const { error } = await supabase.from(table).select('*', { count: 'exact' }).limit(0);
          
          if (!error || !error.message.includes('not found')) {
            console.log(`   ✅ ${table} (now found!)`);
            tableStatus[table] = true;
          } else {
            console.log(`   ❌ ${table}`);
            stillMissing = true;
          }
        } catch {
          console.log(`   ❌ ${table}`);
          stillMissing = true;
        }
      } else if (tableStatus[table] === true) {
        console.log(`   ✅ ${table}`);
      }
    }

    console.log();

    if (!stillMissing) {
      console.log('✅ All tables created successfully!\n');
      await insertSampleUser(supabase);
      rl.close();
      return;
    }

    if (retries > 1) {
      console.log(`⚠️  Some tables still missing. Retrying... (${retries - 1} attempts left)\n`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    retries--;
  }

  console.log('❌ Tables still not found. Please verify:');
  console.log('   - SQL executed without errors in Supabase');
  console.log('   - Tables appear in "Table Editor" (left sidebar)');
  console.log('   - Network connection to Supabase\n');

  rl.close();
  process.exit(1);
}

async function insertSampleUser(supabase) {
  console.log('📋 STEP 3: Inserting sample user...\n');

  try {
    // Check if user already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'noeltebei478@gmail.com')
      .single();

    if (existing) {
      console.log('✅ Sample user already exists (Billions)\n');
      showLoginDetails();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

    // Insert new user
    const { data, error } = await supabase
      .from('users')
      .insert({
        name: 'Billions',
        email: 'noeltebei478@gmail.com',
        password: hashedPassword,
        role: 'tenant',
        is_verified: true,
        is_active: true,
        verification_status: 'verified'
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    console.log('✅ Sample user created: Billions\n');
    showLoginDetails();

  } catch (error) {
    console.error('❌ Failed to insert sample user:', error.message, '\n');
    process.exit(1);
  }
}

function showLoginDetails() {
  console.log('🎉 Setup Complete!\n');
  console.log('Sample User Login Details:');
  console.log('-'.repeat(70));
  console.log('  Email:    noeltebei478@gmail.com');
  console.log('  Password: TestPassword123!');
  console.log('  Role:     Tenant');
  console.log('-'.repeat(70) + '\n');

  console.log('Next steps:');
  console.log('  1. Start backend: npm run dev');
  console.log('  2. Test login: POST /api/auth/login');
  console.log('  3. Start frontend: cd ../client && npm run dev\n');
}

main().catch(err => {
  console.error('Error:', err.message);
  rl.close();
  process.exit(1);
});
