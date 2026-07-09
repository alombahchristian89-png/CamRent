const { Client } = require('pg');

const resolveConnectionConfig = () => {
  if (process.env.SUPABASE_DB_URL) {
    return {
      connectionString: process.env.SUPABASE_DB_URL,
      ssl: { rejectUnauthorized: false }
    };
  }

  if (
    process.env.SUPABASE_DB_HOST
    && process.env.SUPABASE_DB_PORT
    && process.env.SUPABASE_DB_NAME
    && process.env.SUPABASE_DB_USER
    && process.env.SUPABASE_DB_PASSWORD
  ) {
    return {
      host: process.env.SUPABASE_DB_HOST,
      port: Number(process.env.SUPABASE_DB_PORT),
      database: process.env.SUPABASE_DB_NAME,
      user: process.env.SUPABASE_DB_USER,
      password: process.env.SUPABASE_DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    };
  }

  return null;
};

const getDbClient = async () => {
  const config = resolveConnectionConfig();
  if (!config) {
    throw new Error('Supabase DB connection details are missing. Configure SUPABASE_DB_URL or SUPABASE_DB_* variables.');
  }

  const client = new Client(config);
  await client.connect();
  return client;
};

let ensurePromise = null;

const ensureAuditStoreTables = async () => {
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    const client = await getDbClient();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.audit_logs (
          id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
          admin_id BIGINT,
          target_user_id BIGINT,
          action_type TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          details JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS public.activity_logs (
          id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
          actor_user_id BIGINT,
          target_user_id BIGINT,
          action_type TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          details JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `);

      await client.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);');
      await client.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.audit_logs(admin_id);');
      await client.query('CREATE INDEX IF NOT EXISTS idx_audit_logs_target_user_id ON public.audit_logs(target_user_id);');
      await client.query('CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);');
      await client.query('CREATE INDEX IF NOT EXISTS idx_activity_logs_actor_user_id ON public.activity_logs(actor_user_id);');
      await client.query('CREATE INDEX IF NOT EXISTS idx_activity_logs_target_user_id ON public.activity_logs(target_user_id);');
    } finally {
      await client.end();
    }
  })();

  try {
    await ensurePromise;
  } finally {
    ensurePromise = null;
  }
};

const insertActivityLogRow = async ({ actorUserId = null, targetUserId = null, actionType, entityType, details = {} }) => {
  await ensureAuditStoreTables();

  const client = await getDbClient();
  try {
    await client.query(
      `
        INSERT INTO public.activity_logs (actor_user_id, target_user_id, action_type, entity_type, details, created_at)
        VALUES ($1, $2, $3, $4, $5::jsonb, now())
      `,
      [actorUserId, targetUserId, actionType, entityType, JSON.stringify(details || {})]
    );
  } finally {
    await client.end();
  }
};

const insertAuditLogRow = async ({ adminId = null, targetUserId = null, actionType, entityType, details = {} }) => {
  await ensureAuditStoreTables();

  const client = await getDbClient();
  try {
    await client.query(
      `
        INSERT INTO public.audit_logs (admin_id, target_user_id, action_type, entity_type, details, created_at)
        VALUES ($1, $2, $3, $4, $5::jsonb, now())
      `,
      [adminId, targetUserId, actionType, entityType, JSON.stringify(details || {})]
    );
  } finally {
    await client.end();
  }
};

const getMergedAuditRows = async ({ page = 1, limit = 15 }) => {
  await ensureAuditStoreTables();

  const offset = Math.max(0, (page - 1) * limit);
  const safeLimit = Math.max(1, limit);

  const client = await getDbClient();
  try {
    const rowsResult = await client.query(
      `
        SELECT *
        FROM (
          SELECT id, 'audit'::text AS source, admin_id AS actor_user_id, target_user_id, action_type, entity_type, details, created_at
          FROM public.audit_logs
          UNION ALL
          SELECT id, 'activity'::text AS source, actor_user_id, target_user_id, action_type, entity_type, details, created_at
          FROM public.activity_logs
        ) merged
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `,
      [safeLimit, offset]
    );

    const countResult = await client.query(
      `
        SELECT
          (SELECT COUNT(*) FROM public.audit_logs)::bigint
          +
          (SELECT COUNT(*) FROM public.activity_logs)::bigint
          AS total
      `
    );

    const total = Number(countResult.rows?.[0]?.total || 0);

    return {
      rows: rowsResult.rows || [],
      total
    };
  } finally {
    await client.end();
  }
};

module.exports = {
  ensureAuditStoreTables,
  insertActivityLogRow,
  insertAuditLogRow,
  getMergedAuditRows
};
