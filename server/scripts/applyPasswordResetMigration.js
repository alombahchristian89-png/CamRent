const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { loadEnv } = require('../src/utils/loadEnv');

loadEnv(path.join(__dirname, '..'));

async function main() {
  const sqlPath = path.join(__dirname, '..', 'migrations', '20260715_add_password_reset_columns.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const cfg = process.env.SUPABASE_DB_URL
    ? {
        connectionString: process.env.SUPABASE_DB_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        user: process.env.SUPABASE_DB_USER,
        password: process.env.SUPABASE_DB_PASSWORD,
        host: process.env.SUPABASE_DB_HOST,
        port: Number(process.env.SUPABASE_DB_PORT || 5432),
        database: process.env.SUPABASE_DB_NAME,
        ssl: { rejectUnauthorized: false },
      };

  const client = new Client(cfg);

  try {
    await client.connect();
    await client.query(sql);

    const result = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name IN ('reset_password_token', 'reset_password_expires')
      ORDER BY column_name
    `);

    console.log(JSON.stringify({
      applied: true,
      columns: result.rows.map((row) => row.column_name)
    }));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    applied: false,
    error: error.message
  }));
  process.exit(1);
});
