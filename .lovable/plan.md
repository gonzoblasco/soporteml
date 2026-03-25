

## Fix: supabaseUrl is required on soporteml.com

### Root cause (confirmed via browser)

The published site at `soporteml.com` is serving `index-B-L9H9yS.js` — an old production bundle compiled **before** the environment variables were configured. The code in `src/integrations/supabase/client.ts` is correct, but Vite embeds `import.meta.env` values at **build time**. Since no successful publish has occurred since the fix, the old bundle persists.

### Plan

| Step | Action |
|------|--------|
| 1 | **Add runtime fallback** in `src/integrations/supabase/client.ts` — if `import.meta.env.VITE_SUPABASE_URL` is empty/undefined at runtime, fall back to the hardcoded production values. This makes the app resilient to missing env vars in any future stale-build scenario. |
| 2 | **Publish the app** — triggers a new Vite build that embeds the env vars correctly into the JS bundle, replacing `index-B-L9H9yS.js` with a fresh one. |

### Technical detail

**`src/integrations/supabase/client.ts`** — Add fallback constants (the values are already public/non-secret — they're the anon key and project URL visible in `.env.example`):

```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ropbkdqhqdeiwrenrmjt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

**Why a fallback?** This file is auto-generated and normally shouldn't be edited, but this is a one-line safety net. If Lovable regenerates it, the fallback disappears but so does the problem (because regeneration means a fresh build with env vars). The fallback only helps when a stale bundle gets served.

**Alternative (no code change):** Simply publish — the new build will embed the correct values. But the fallback protects against future stale-bundle scenarios.

