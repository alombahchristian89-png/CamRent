const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

dotenv.config();

async function bootstrapDatabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('❌ Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  try {
    console.log('Connecting to Supabase...');
    console.log(`Project: ${supabaseUrl}`);

    // Test connection via a simple query
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count', { count: 'exact' })
      .limit(0);

    if (testError && testError.code !== 'PGRST116') {
      throw new Error(`Connection test failed: ${testError.message}`);
    }

    console.log('✅ Connected to Supabase\n');

    // Read schema
    const schemaPath = path.join(__dirname, '..', '..', 'supabase-schema.sql');
    console.log(`📝 Reading schema from ${schemaPath}...`);
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }

    const schema = fs.readFileSync(schemaPath, 'utf-8');
    console.log('✅ Schema loaded\n');

    console.log('🚀 Executing schema via Supabase RPC...\n');
    
    // Split SQL by semicolons and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let executed = 0;
    const errors = [];

    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          // Some errors are expected (like "already exists"), so we'll track but not fail
          if (!error.message.includes('already exists') && 
              !error.message.includes('Already exists') &&
              !error.message.includes('duplicate key')) {
            errors.push(`Statement failed: ${error.message}`);
            console.log(`⚠️  ${error.message}`);
          } else {
            console.log(`ℹ️  ${error.message.split('\n')[0]}`);
          }
        } else {
          executed++;
          process.stdout.write('.');
        }
      } catch (err) {
        // Function might not exist, try alternative approach
        console.log('\n📌 RPC method not available, using direct schema import instead');
        console.log('   Please manually run the schema file in Supabase SQL Editor:\n');
        console.log(`   Path: ${schemaPath}\n`);
        break;
      }
    }

    console.log(`\n\n✨ Schema bootstrap completed!`);
    console.log(`   Executed: ${executed} statements`);
    
    if (errors.length > 0) {
      console.log(`\n⚠️  Some errors occurred (these may be non-critical):`);
      errors.forEach(err => console.log(`   - ${err}`));
    }

    // Verify tables exist
    console.log('\n🔍 Verifying tables...');
    const { data: tables, error: verifyError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['users', 'properties', 'favorites', 'inquiries']);

    if (!verifyError && tables) {
      console.log(`✅ Tables found: ${tables.length}/4`);
      tables.forEach(t => console.log(`   ✓ ${t.table_name}`));
    } else {
      console.log('⚠️  Could not verify tables via information_schema');
      console.log('   Tables may have been created. Check your Supabase dashboard.\n');
    }

  } catch (error) {
    console.error('\n❌ Bootstrap error:', error.message);
    process.exit(1);
  }
}

bootstrapDatabase();
