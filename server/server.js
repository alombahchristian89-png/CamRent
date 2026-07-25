const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { loadEnv } = require('./src/utils/loadEnv');

loadEnv(__dirname, { allowExampleFallback: false });

const readEnv = (name) => String(process.env[name] || '').trim().replace(/^['\"]|['\"]$/g, '');
const isPlaceholder = (value) => {
  const normalized = String(value || '').toLowerCase();
  return !normalized
    || normalized.includes('replace_me')
    || normalized.includes('your-project-ref')
    || normalized.includes('your-domain.com')
    || normalized.includes('example');
};

const validateRequiredEnv = () => {
  const missing = [];
  const supabaseUrl = readEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');
  const publishableKey = readEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

  if (isPlaceholder(supabaseUrl)) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL');
  }

  if (isPlaceholder(serviceRoleKey) && isPlaceholder(publishableKey)) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  }

  if (missing.length > 0) {
    console.error('[Startup] Missing required environment variables:', missing.join(', '));
    console.error('Copy server/.env.example to server/.env and add your Supabase credentials.');
    process.exit(1);
  }
};

validateRequiredEnv();

const { supabase } = require('./src/services/supabaseClient');

const app = express();
app.set('trust proxy', 1);

const configuredOrigins = (readEnv('FRONTEND_URL') || '')
  .split(',')
  .map((origin) => origin.trim())
  .map((origin) => origin.replace(/\/+$/, ''))
  .filter(Boolean);

const defaultDevOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'];
const allowedOrigins = new Set([...configuredOrigins, ...defaultDevOrigins]);

const corsOptions = {
  origin: (origin, callback) => {
    const normalizedOrigin = String(origin || '').replace(/\/+$/, '');

    if (!origin || allowedOrigins.has(normalizedOrigin)) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
};

// Rate limiting
// Keep a generous global limiter for all API traffic.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again shortly.'
  }
});

// Apply a stricter limiter only on auth routes (e.g. login/register).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please wait and try again.'
  }
});

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', globalLimiter);

async function checkSupabaseConnection() {
  if (isPlaceholder(readEnv('NEXT_PUBLIC_SUPABASE_URL'))) {
    return {
      ok: false,
      message: 'NEXT_PUBLIC_SUPABASE_URL is missing'
    };
  }

  if (isPlaceholder(readEnv('SUPABASE_SERVICE_ROLE_KEY')) && isPlaceholder(readEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'))) {
    return {
      ok: false,
      message: 'SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) is missing'
    };
  }

  const { error } = await supabase.from('users').select('id').limit(1);

  if (error) {
    return {
      ok: false,
      message: error.message
    };
  }

  return {
    ok: true,
    message: 'Supabase connection OK'
  };
}

app.get('/api/health', async (req, res) => {
  try {
    const supabaseStatus = await checkSupabaseConnection();
    const statusCode = supabaseStatus.ok ? 200 : 503;

    res.status(statusCode).json({
      success: supabaseStatus.ok,
      service: 'camrent-server',
      port: Number(process.env.PORT || 5000),
      supabase: supabaseStatus
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      service: 'camrent-server',
      supabase: {
        ok: false,
        message: error.message
      }
    });
  }
});

// Routes
app.use('/api/auth', authLimiter, require('./src/routes/auth'));
app.use('/api/properties', require('./src/routes/properties'));
app.use('/api/favorites', require('./src/routes/favorites'));
app.use('/api/inquiries', require('./src/routes/inquiries'));
app.use('/api/notifications', require('./src/routes/notifications'));
app.use('/api/landlord', require('./src/routes/landlord'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/upload', require('./src/routes/upload'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!' 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  try {
    const supabaseStatus = await checkSupabaseConnection();

    if (supabaseStatus.ok) {
      console.log(`[Startup] Supabase: CONNECTED (${process.env.NEXT_PUBLIC_SUPABASE_URL})`);
    } else {
      console.error(`[Startup] Supabase: NOT CONNECTED (${supabaseStatus.message})`);
    }
  } catch (error) {
    console.error(`[Startup] Supabase: NOT CONNECTED (${error.message})`);
  }

  try {
    // initialize notification websocket hub
    const { initNotificationHub } = require('./src/services/notificationHub');
    initNotificationHub(server);
  } catch (err) {
    console.error('[Startup] Failed to initialize notification hub:', err.message || err);
  }
});
