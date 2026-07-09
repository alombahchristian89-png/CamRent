const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

dotenv.config();

async function setupDatabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    console.error('❌ Missing env var: NEXT_PUBLIC_SUPABASE_URL');
    process.exit(1);
  }

  if (!supabaseServiceRoleKey && !supabasePublishableKey) {
    console.error('❌ Missing env vars: Need either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
    process.exit(1);
  }

  const apiKey = supabaseServiceRoleKey || supabasePublishableKey;
  const keyType = supabaseServiceRoleKey ? 'Service Role' : 'Publishable';

  const supabase = createClient(supabaseUrl, apiKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  console.log('\n🚀 Setting up CAMRENT Supabase Database\n');
  console.log(`Project: ${supabaseUrl}\n`);

  try {
    // Step 1: Test connection
    console.log('1️⃣  Testing connection...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count', { count: 'exact' })
      .limit(0);

    if (testError && !testError.message.includes('not found')) {
      throw new Error(`Connection test failed: ${testError.message}`);
    }

    console.log('✅ Connected to Supabase\n');

    // Step 2: Check if tables exist
    console.log('2️⃣  Checking for existing tables...');
    const tables = ['users', 'properties', 'favorites', 'inquiries'];
    let allExist = true;

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(0);

      if (error && error.message.includes('not found')) {
        console.log(`   ⚠️  ${table} - not found`);
        allExist = false;
      } else if (error) {
        console.log(`   ⚠️  ${table} - error checking`);
        allExist = false;
      } else {
        console.log(`   ✅ ${table} - exists`);
      }
    }

    if (!allExist) {
      console.log('\n⚠️  Some tables are missing. Manual setup required.\n');
      console.log('📋 Instructions:');
      console.log('1. Go to: https://app.supabase.com');
      console.log('2. Select project: zsxriivzjzdshvukmoqa');
      console.log('3. Click: SQL Editor (left sidebar)');
      console.log('4. Click: New Query');
      console.log('5. Copy SQL from: server/supabase-schema.sql');
      console.log('6. Paste and click: Run');
      console.log('\n7. After running SQL, return here and try again.\n');
      process.exit(1);
    }

    console.log('✅ All tables exist\n');

    // Step 3: Check if sample user already exists
    console.log('3️⃣  Checking for sample user...');
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'noeltebei478@gmail.com')
      .single();

    if (existingUser) {
      console.log('✅ Sample user already exists (Billions)\n');
      console.log('User details:');
      console.log(`  Email: ${existingUser.email}`);
      console.log(`  Role: ${existingUser.role}`);
      console.log(`  ID: ${existingUser.id}\n`);
      console.log('✨ Database is ready for use!\n');
      process.exit(0);
    }

    // Step 4: Insert sample user
    console.log('4️⃣  Creating sample user...');
    
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
    
    const { data: newUser, error: insertError } = await supabase
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

    if (insertError) {
      throw new Error(`Failed to insert user: ${insertError.message}`);
    }

    console.log('✅ Sample user created\n');
    console.log('User details:');
    console.log(`  Name: ${newUser.name}`);
    console.log(`  Email: ${newUser.email}`);
    console.log(`  Role: ${newUser.role}`);
    console.log(`  ID: ${newUser.id}`);
    console.log(`  Status: ${newUser.is_verified ? 'Verified' : 'Not Verified'}\n`);

    console.log('🎉 Database setup complete!\n');
    console.log('Quick test - login with:');
    console.log('  Email: noeltebei478@gmail.com');
    console.log('  Password: TestPassword123!\n');
    console.log('Start backend: npm run dev\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('- Check .env has correct Supabase credentials');
    console.error('- Make sure tables were created in Supabase dashboard');
    console.error('- Verify network connectivity to Supabase\n');
    process.exit(1);
  }
}

setupDatabase();
