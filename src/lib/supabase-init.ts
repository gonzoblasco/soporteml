/**
 * Resilient Supabase client wrapper.
 *
 * The auto-generated client at `@/integrations/supabase/client` relies on
 * `import.meta.env` values that Vite inlines at **build time**. If a stale
 * production bundle is served (CDN cache, SW cache, etc.) those values may
 * be empty, causing a "supabaseUrl is required" crash.
 *
 * This module re-exports a `supabase` instance that falls back to hardcoded
 * production values (public anon key — not a secret) when env vars are missing.
 *
 * ALL application code should import from here instead of the auto-generated file.
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const FALLBACK_URL = 'https://ropbkdqhqdeiwrenrmjt.supabase.co';
const FALLBACK_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvcGJrZHFocWRlaXdyZW5ybWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTYyNTAsImV4cCI6MjA4NzQzMjI1MH0.NJStUzfzL5M76pOtlfUVa_Whf0WS74k49xTqRJapXoA';

const url = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_KEY;

export const supabase = createClient<Database>(url, key, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
