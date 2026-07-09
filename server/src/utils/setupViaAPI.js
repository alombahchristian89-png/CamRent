const https = require('https');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

function executeSupabaseSQL(sql) {
  return new Promise((resolve, reject) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const apiKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !apiKey) {
      reject(new Error('Missing Supabase credentials'));
      return;
    }

    // Extract host from URL
    const url = new URL(supabaseUrl);
    const hostname = url.hostname;

    // Supabase REST API endpoint for raw SQL
    const path = '/rest/v1/rpc/sql_exec';

    const options = {
      hostname,
      port: 443,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'apikey': apiKey
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ success: true, data });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(JSON.stringify({ sql }));
    req.end();
  });
}

async function setupTables() {
  console.log('\n🚀 Setting up CAMRENT Supabase Database\n');

  try {
    const schemaPath = path.join(__dirname, '..', '..', 'server', 'supabase-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    console.log('📝 Schema loaded');
    console.log('🚀 Executing via Supabase API...\n');

    await executeSupabaseSQL(schema);
    
    console.log('✅ Tables created successfully!\n');

  } catch (error) {
    console.error('❌ Setup failed:', error.message, '\n');
    console.log('📋 Manual Setup Required:\n');
    console.log('1. Go to: https://app.supabase.com/project/zsxriivzjzdshvukmoqa');
    console.log('2. Click: SQL Editor → New Query');
    console.log('3. Copy SQL from: TABLE_SETUP.md in project root');
    console.log('4. Paste and click: Run');
    console.log('5. Come back and run: npm run setup:db\n');
    process.exit(1);
  }
}

setupTables();
