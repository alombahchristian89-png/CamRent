const pg = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

async function createTablesViaDirect() {
  console.log('🔌 Attempting direct PostgreSQL connection to Supabase...\n');

  const connectionConfig = {
    user: process.env.SUPABASE_DB_USER,
    password: process.env.SUPABASE_DB_PASSWORD,
    host: process.env.SUPABASE_DB_HOST,
    port: parseInt(process.env.SUPABASE_DB_PORT || '5432'),
    database: process.env.SUPABASE_DB_NAME,
    ssl: {
      rejectUnauthorized: false,
      mode: 'require'
    },
    // Connection pool settings
    statement_timeout: 30000,
    query_timeout: 30000,
  };

  const client = new pg.Client(connectionConfig);

  try {
    console.log(`Connecting to ${connectionConfig.host}:${connectionConfig.port}/${connectionConfig.database}...\n`);
    
    await client.connect();
    console.log('✅ Connected to database!\n');

    // Read schema file
    const schemaPath = path.join(__dirname, '..', '..', 'server', 'supabase-schema.sql');
    console.log(`📝 Reading schema from ${schemaPath}...`);
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }

    const schema = fs.readFileSync(schemaPath, 'utf-8');
    console.log('✅ Schema loaded\n');

    console.log('🚀 Executing schema SQL...\n');

    // Execute the entire schema as one statement
    const result = await client.query(schema);
    
    console.log('✅ Schema executed successfully!\n');

    // Verify tables were created
    console.log('🔍 Verifying tables...\n');
    
    const tables = ['users', 'properties', 'favorites', 'inquiries'];
    for (const table of tables) {
      const checkResult = await client.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)`,
        [table]
      );
      
      if (checkResult.rows[0].exists) {
        console.log(`✅ ${table}`);
      } else {
        console.log(`❌ ${table}`);
      }
    }

    console.log('\n✨ Database setup complete!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Connection failed:', error.message, '\n');
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.log('ℹ️  Direct database connection not available.');
      console.log('   This is normal for some network configurations.\n');
      console.log('📋 Alternative Setup Method:\n');
      console.log('1. Go to: https://app.supabase.com/project/zsxriivzjzdshvukmoqa');
      console.log('2. Click: SQL Editor → New Query');
      console.log('3. Copy SQL from: TABLE_SETUP.md');
      console.log('4. Paste and click: Run');
      console.log('5. Return here and run: npm run setup:db\n');
    }

    process.exit(1);

  } finally {
    await client.end();
  }
}

createTablesViaDirect();
