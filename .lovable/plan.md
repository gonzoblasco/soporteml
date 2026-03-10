

## Bug Analysis: Multi-Company Question Visibility

### Root Causes Found

**Bug 1 — Inbox/PriorityInbox never auto-refresh after new questions arrive**
- `Inbox.tsx` and `PriorityInbox.tsx` only fetch questions on mount and when `statusFilter` or `currentCompanyId` changes.
- There is NO realtime subscription in these components. When `sync-meli-questions` inserts a new question, the DashboardLayout realtime fires a toast, but the list components have stale data and never refetch.
- The user must navigate away and back to see new questions.

**Bug 2 — DashboardLayout realtime fires toasts for ALL companies**
- The realtime channel in `DashboardLayout.tsx` (line 97-155) subscribes to `questions` table inserts with NO `company_id` filter. This means toasts appear for questions from any company, not just the user's active company. This explains why the toast fires but the question doesn't match the current company's list.

**Bug 3 — MeliConnectionStatus ignores currentCompanyId**
- `MeliConnectionStatus.tsx` queries `meli_connection_status` with `.limit(1).maybeSingle()` and no `company_id` filter (line 13-17). It shows the status of whatever token row comes first — often the wrong company. The `useEffect` also has no dependency on company changes, so switching companies doesn't update it.

### Fix Plan

**1. MeliConnectionStatus.tsx** — Add `currentCompanyId` filter
- Import `useAuth`, filter query by `.eq('company_id', currentCompanyId)`, add `currentCompanyId` to `useEffect` deps.

**2. DashboardLayout.tsx** — Filter realtime toasts by active company
- Import `useAuth`, get `currentCompanyId`. In each realtime callback, check `q.company_id === currentCompanyId` before showing the toast. Re-subscribe when `currentCompanyId` changes.

**3. Inbox.tsx** — Add realtime subscription for auto-refresh
- Subscribe to `postgres_changes` INSERT on `questions` table. On receiving an insert where `company_id` matches `currentCompanyId`, call `fetchQuestions()` to refresh the list. Clean up subscription on unmount.

**4. PriorityInbox.tsx** — Same realtime auto-refresh
- Identical pattern: subscribe to INSERT events filtered by current company, auto-refetch.

### Files to Modify
- `src/components/MeliConnectionStatus.tsx`
- `src/components/DashboardLayout.tsx`
- `src/pages/Inbox.tsx`
- `src/pages/PriorityInbox.tsx`

### What to Test After Fix
1. Log in as non-super-admin user with a connected MeLi account
2. Trigger a sync — verify the new question appears immediately in Inbox/PriorityInbox without navigating away
3. Verify MeLi connection status shows "Conectado" for the correct company
4. Switch companies — verify the question list and MeLi status update accordingly
5. Confirm toasts only fire for questions belonging to the active company

