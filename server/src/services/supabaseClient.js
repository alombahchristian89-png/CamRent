const { createClient } = require('@supabase/supabase-js');

const readEnv = (name) => String(process.env[name] || '').trim().replace(/^['\"]|['\"]$/g, '');
const isPlaceholder = (value) => {
  const normalized = String(value || '').toLowerCase();
  return !normalized
    || normalized.includes('replace_me')
    || normalized.includes('your-project-ref')
    || normalized.includes('example');
};

const supabaseUrl = readEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');
const supabasePublishableKey = readEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
const supabaseKey = supabaseServiceRoleKey || supabasePublishableKey;

if (isPlaceholder(supabaseUrl) || isPlaceholder(supabaseKey)) {
  throw new Error('Supabase env vars are missing. Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).');
}

const transientNetworkCodes = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ETIMEDOUT']);

const isTransientNetworkError = (error) => {
  const code = String(error?.cause?.code || error?.code || '').toUpperCase();
  const message = String(error?.message || '').toUpperCase();
  const causeMessage = String(error?.cause?.message || '').toUpperCase();

  return transientNetworkCodes.has(code)
    || [...transientNetworkCodes].some((networkCode) => message.includes(networkCode) || causeMessage.includes(networkCode));
};

const resilientFetch = async (input, init) => {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fetch(input, init);
    } catch (error) {
      if (!isTransientNetworkError(error) || attempt === maxAttempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
  }

  throw new Error('Supabase request failed unexpectedly');
};

const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
  global: {
    fetch: resilientFetch
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

module.exports = { supabase };
