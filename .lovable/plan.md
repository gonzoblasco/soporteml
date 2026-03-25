

## Fix: `supabaseUrl is required` on custom domain

### Problem

The custom domain is still serving `index-B-L9H9yS.js` — a stale bundle where Vite inlined empty/undefined env vars. Since `import.meta.env` is replaced at **compile time**, no runtime patch can fix an already-compiled bundle. And `src/integrations/supabase/client.ts` is auto-generated and cannot be edited.

### Solution

Add a **bootstrap script** in `index.html` that runs **before** the app module loads. This script will:
1. Detect if the Supabase client throws the `supabaseUrl is required` error
2. Monkey-patch the `createClient` export to inject the correct production values

However, since `import.meta.env` is statically replaced, the simpler and more reliable approach is:

**Create a non-auto-generated initialization file** (`src/lib/supabase-init.ts`) that wraps the auto-generated client with a try/catch fallback, and update all imports to use it instead.

### Plan

| Step | Action |
|------|--------|
| 1 | Create `src/lib/supabase-init.ts` — tries to import from `@/integrations/supabase/client`. If the client was created with empty URL (stale bundle), it catches the error and creates a new client with hardcoded production values. Re-exports `supabase`. |
| 2 | Update all imports across the codebase — replace `import { supabase } from "@/integrations/supabase/client"` with `import { supabase } from "@/lib/supabase-init"` in every file that uses it (AuthContext, edge function callers, hooks, pages, etc.). |
| 3 | Publish the app — triggers a fresh build. Even with the fresh build, the fallback remains as a safety net. |

### Technical detail

**`src/lib/supabase-init.ts`**:
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const FALLBACK_URL = "https://ropbkdqhqdeiwrenrmjt.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvcGJrZHFocWRlaXdyZW5ybWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTYyNTAsImV4cCI6MjA4NzQzMjI1MH0.NJStUzfzL5M76pOtlfUVa_Whf0WS74k49xTqRJapXoA";

const url = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_KEY;

export const supabase = createClient<Database>(url, key, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
```

**Files to update** (import path change only):
- `src/contexts/AuthContext.tsx`
- `src/api/ai.ts`
- `src/components/AICopilotPanel.tsx`
- `src/components/MeliConnectionStatus.tsx`
- `src/components/OnboardingWizard.tsx`
- `src/components/settings/*.tsx` (multiple)
- `src/components/admin/*.tsx`
- `src/components/catalog/*.tsx`
- `src/pages/*.tsx` (Inbox, CatalogPage, etc.)
- `src/lib/auditLog.ts`
- Any other file importing from `@/integrations/supabase/client`

These are public, non-secret values (the anon key is already visible in `.env.example` and in the HTML source). The fallback ensures the app works even when served from a CDN-cached stale bundle.

