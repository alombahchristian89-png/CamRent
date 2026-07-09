const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

async function verifySupabaseSetup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    console.error('❌ Missing environment variables');
    console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  console.log('\n🔍 Verifying Supabase Setup\n');
  console.log(`Project: ${supabaseUrl}\n`);

  const tables = ['users', 'properties', 'favorites', 'inquiries'];
  let allGood = true;

  for (const table of tables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(0);

      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`⚠️  Table: ${table} (not found - needs to be created)`);
          allGood = false;
        } else {
          console.log(`❌ Table: ${table} (error: ${error.message})`);
          allGood = false;
        }
      } else {
        console.log(`✅ Table: ${table} (${count} rows)`);
      }
    } catch (err) {
      console.log(`❌ Table: ${table} (${err.message})`);
      allGood = false;
    }
  }

  console.log();

  if (allGood) {
    console.log('✨ All tables are ready! Backend can start.\n');
    console.log('Run: npm run dev\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tables are missing.\n');
    console.log('To create tables:');
    console.log('1. Go to Supabase Dashboard SQL Editor');
    console.log('2. Create a new query');
    console.log('3. Copy SQL from: server/supabase-schema.sql');
    console.log('4. Run the query\n');
    process.exit(1);
  }
}

verifySupabaseSetup();
