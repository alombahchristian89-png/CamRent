const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load .env from server directory
const envPath = path.join(__dirname, '../../.env');
console.log(`Loading .env from: ${envPath}`);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('✓ .env loaded\n');
} else {
  console.log('✗ .env not found\n');
}

async function insertSampleUser() {
  console.log('🚀 Inserting sample user...\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  console.log('URL:', supabaseUrl ? '✓' : '✗');
  console.log('Key:', supabaseKey ? '✓' : '✗');
  console.log();

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase env vars');
    console.error(`URL: ${supabaseUrl}`);
    console.error(`Key: ${supabaseKey}`);
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  try {
    console.log('Waiting for schema cache refresh... (10 seconds)');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Hash password
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);

    console.log('Creating user "Billions"...');

    let retries = 3;
    let lastError;

    while (retries > 0) {
      try {
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
          lastError = error;
          if (retries > 1) {
            console.log(`  Attempt ${4 - retries} failed, retrying...\n`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            retries--;
          } else {
            throw error;
          }
        } else {
          console.log('✅ Sample user created!\n');
          console.log('User Details:');
          console.log('  Name: ' + data.name);
          console.log('  Email: ' + data.email);
          console.log('  Role: ' + data.role);
          console.log('  ID: ' + data.id + '\n');

          console.log('🎉 Setup Complete!\n');
          console.log('Test Login:');
          console.log('  Email: noeltebei478@gmail.com');
          console.log('  Password: TestPassword123!\n');

          process.exit(0);
        }
      } catch (err) {
        lastError = err;
        if (retries > 1) {
          retries--;
          console.log(`  Attempt ${4 - retries} failed, retrying...\n`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        } else {
          throw lastError;
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message, '\n');
    
    if (error.message && error.message.includes('schema cache')) {
      console.log('💡 Tip: The database schema cache needs more time to refresh.');
      console.log('   Try one of these:');
      console.log('   1. Wait 30 seconds and run this script again');
      console.log('   2. Go to Supabase Dashboard > Table Editor');
      console.log('   3. Click refresh button (circular icon)');
      console.log('   4. Run this script again\n');
    }
    
    process.exit(1);
  }
}

insertSampleUser();
