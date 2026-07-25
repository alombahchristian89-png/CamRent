import { createBrowserClient } from '@supabase/ssr';

const normalizeEnvValue = (value) => String(value ?? '').trim().replace(/^['"]|['"]$/g, '');

const isPlaceholderValue = (value) => {
  const normalized = normalizeEnvValue(value).toLowerCase();

  return !normalized
    || normalized.includes('replace_me')
    || normalized.includes('your-project-ref')
    || normalized.includes('example')
    || normalized.includes('ttt');
};

const supabaseUrl = normalizeEnvValue(
  import.meta.env.VITE_SUPABASE_URL
  || import.meta.env.NEXT_PUBLIC_SUPABASE_URL
);
const supabasePublishableKey = normalizeEnvValue(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY
  || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const supabase = !isPlaceholderValue(supabaseUrl) && !isPlaceholderValue(supabasePublishableKey)
  ? createBrowserClient(supabaseUrl, supabasePublishableKey)
  : null;

if (!supabase) {
  console.warn('[Supabase] Realtime disabled because the Supabase URL or publishable key is missing or still using a placeholder value.');
}
