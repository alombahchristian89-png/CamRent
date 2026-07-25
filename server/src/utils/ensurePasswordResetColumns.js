const { Client } = require('pg');

const RESET_MIGRATION_SQL = `
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS reset_password_token TEXT,
  ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_reset_password_token
  ON public.users(reset_password_token);
`;

const CACHE_WINDOW_MS = 10 * 60 * 1000;
let lastSuccessAt = 0;
let inFlightMigration = null;

const getPgConfig = () => {
  if (process.env.SUPABASE_DB_URL) {
    return {
      connectionString: process.env.SUPABASE_DB_URL,
      ssl: { rejectUnauthorized: false }
    };
  }

  if (
    process.env.SUPABASE_DB_HOST
    && process.env.SUPABASE_DB_USER
    && process.env.SUPABASE_DB_PASSWORD
    && process.env.SUPABASE_DB_NAME
  ) {
    return {
      host: process.env.SUPABASE_DB_HOST,
      user: process.env.SUPABASE_DB_USER,
      password: process.env.SUPABASE_DB_PASSWORD,
      database: process.env.SUPABASE_DB_NAME,
      port: Number(process.env.SUPABASE_DB_PORT || 5432),
      ssl: { rejectUnauthorized: false }
    };
  }

  return null;
};

const ensurePasswordResetColumns = async () => {
  const now = Date.now();
  if (lastSuccessAt && now - lastSuccessAt < CACHE_WINDOW_MS) {
    return true;
  }

  if (inFlightMigration) {
    return inFlightMigration;
  }

  const pgConfig = getPgConfig();
  if (!pgConfig) {
    return false;
  }

  inFlightMigration = (async () => {
    const client = new Client(pgConfig);
    try {
      await client.connect();
      await client.query(RESET_MIGRATION_SQL);
      lastSuccessAt = Date.now();
      return true;
    } catch (error) {
      console.warn('Password reset column migration attempt failed:', error.message || error);
      return false;
    } finally {
      try {
        await client.end();
      } catch (closeError) {
        console.warn('Password reset migration connection close failed:', closeError.message || closeError);
      }
    }
  })();

  try {
    return await inFlightMigration;
  } finally {
    inFlightMigration = null;
  }
};

module.exports = { ensurePasswordResetColumns };
