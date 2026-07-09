const dotenv = require('dotenv');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

dotenv.config();

async function bootstrapDatabase() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase database...');
    await client.connect();
    console.log('✅ Connected to database');

    const schemaPath = path.join(__dirname, '..', 'supabase-schema.sql');
    console.log(`\nReading schema from ${schemaPath}...`);
    
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    console.log('✅ Schema loaded');

    console.log('\n📝 Executing schema creation...');
    await client.query(schema);
    console.log('✅ Schema created successfully');

    // Verify tables were created
    console.log('\n🔍 Verifying tables...');
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'properties', 'favorites', 'inquiries')
      ORDER BY table_name
    `);

    if (result.rows.length === 4) {
      console.log('✅ All 4 required tables created:');
      result.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.warn(`⚠️  Expected 4 tables, found ${result.rows.length}`);
      result.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    }

    console.log('\n✨ Database bootstrap completed successfully!\n');
  } catch (error) {
    console.error('❌ Database bootstrap failed:', error.message);
    if (error.detail) console.error('   Detail:', error.detail);
    process.exit(1);
  } finally {
    await client.end();
  }
}

bootstrapDatabase();
