const dotenv = require('dotenv');
const { Client } = require('pg');

dotenv.config();

async function inspectSchema() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const query = `
      select table_name, column_name, data_type, is_nullable, column_default
      from information_schema.columns
      where table_schema = 'public'
        and table_name in ('users', 'properties', 'favorites', 'inquiries')
      order by table_name, ordinal_position
    `;

    const result = await client.query(query);
    const grouped = result.rows.reduce((acc, row) => {
      if (!acc[row.table_name]) acc[row.table_name] = [];
      acc[row.table_name].push(row);
      return acc;
    }, {});

    for (const [table, rows] of Object.entries(grouped)) {
      console.log(`\nTABLE ${table}`);
      rows.forEach((row) => {
        console.log(
          `${row.column_name}|${row.data_type}|nullable:${row.is_nullable}|default:${row.column_default || ''}`
        );
      });
    }
  } finally {
    await client.end();
  }
}

inspectSchema().catch((error) => {
  console.error('Schema inspection failed:', error.message);
  process.exit(1);
});
