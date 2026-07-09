const { createClient } = require('@supabase/supabase-js');
const { loadEnv } = require('./src/utils/loadEnv');

loadEnv(__dirname);

async function testSupabaseConnection() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    console.error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabasePublishableKey);

  console.log('Testing Supabase connection...');
  console.log(`Project URL: ${supabaseUrl}`);

  // Try a cheap auth request to verify project reachability and key validity.
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('Supabase connection failed:', error.message);
    process.exit(1);
  }

  console.log('Supabase connection successful.');
  console.log('Session available:', Boolean(data.session));
}

testSupabaseConnection().catch((err) => {
  console.error('Unexpected Supabase test error:', err.message);
  process.exit(1);
});
