

## Two Issues to Fix

### 1. Security: Backfill function lacks super admin enforcement (CRITICAL)

**Problem**: `backfill-ai-answers/index.ts` line 39 fetches `isSuperAdmin` but never checks it. Any authenticated user can trigger cross-company AI backfill.

**Fix**: Add guard after line 39 — if `!isSuperAdmin`, return 403 Forbidden. Also remove the unused `callerCompanyId` RPC call on line 41.

```typescript
// After line 39:
if (!isSuperAdmin) {
  return new Response(JSON.stringify({ error: "Forbidden: super admin only" }), {
    status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

Note: `is_super_admin()` uses `auth.uid()` internally, but here it's called via the service-role client which has no `auth.uid()`. Need to use the `anonClient` instead so the RPC resolves the caller's identity, OR check the user email directly. Will use the same pattern as `debug-meli` (which works correctly).

**Corrected approach**: Call `is_super_admin` via `anonClient` (which carries the user's JWT), not `supabase` (service role).

### 2. Production bundle: `supabaseUrl is required`

**Problem**: The published site's static JS bundle was built without env vars embedded. This is a stale build artifact — the code is correct.

**Fix**: Touch a file to trigger a new build. The `index.html` meta author was already updated. The user needs to **re-publish** to generate a fresh bundle. No code change needed — just a publish action.

### Plan

| Step | Action |
|------|--------|
| 1 | Fix `backfill-ai-answers/index.ts`: enforce super admin check using `anonClient.rpc("is_super_admin")`, return 403 if false, remove dead `callerCompanyId` line |
| 2 | Advise user to re-publish to fix the production `supabaseUrl` error |

