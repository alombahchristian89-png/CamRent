const { Client } = require('pg');
const { loadEnv } = require('./loadEnv');

loadEnv(require('path').resolve(__dirname, '..', '..'));

const requiredTables = ['properties', 'inquiries'];

const quoteLiteral = (value) => `'${String(value).replace(/'/g, "''")}'`;

async function enableRealtime() {
  const dbUrl = process.env.SUPABASE_DB_URL;

  if (!dbUrl) {
    console.error('Missing SUPABASE_DB_URL. Add it to server/.env before running this command.');
    process.exit(1);
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const listLiteral = requiredTables.map(quoteLiteral).join(', ');
    const { rows: existingRows } = await client.query(`
      select tablename
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename in (${listLiteral})
    `);

    const existing = new Set(existingRows.map((row) => row.tablename));
    const missing = requiredTables.filter((table) => !existing.has(table));

    if (!missing.length) {
      console.log('Realtime publication already includes properties and inquiries.');
      process.exit(0);
    }

    const tableList = missing.map((table) => `public.${table}`).join(', ');
    await client.query(`alter publication supabase_realtime add table ${tableList}`);

    console.log(`Realtime enabled for: ${missing.join(', ')}`);
    process.exit(0);
  } catch (error) {
    console.error('Failed to enable realtime publication:', error.message || error);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

enableRealtime();