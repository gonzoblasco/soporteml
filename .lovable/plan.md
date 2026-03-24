

## Fix: Service Worker serving stale bundle

### Root cause

The Service Worker caches `/` (index.html) with a **cache-first** strategy. After a re-publish, the SW keeps serving the old HTML that references `index-B-L9H9yS.js` — a bundle built without env vars. The new bundle never loads because the SW intercepts the navigation request and returns the cached (stale) HTML.

### Plan

| Step | File | Change |
|------|------|--------|
| 1 | `public/sw.js` | Bump `CACHE_NAME` to `soporteml-v2` to invalidate old cache. Switch navigation requests (HTML) to **network-first** strategy so new deploys are always picked up. Keep cache-first only for static assets (images, fonts, manifest). |
| 2 | `index.html` | Add a cache-busting comment with build timestamp to ensure the file hash changes on publish. |

### Technical detail

**`public/sw.js` changes:**
- Bump `CACHE_NAME` → `soporteml-v2`
- Remove `/` from `STATIC_ASSETS` (HTML should not be pre-cached)
- For navigation requests (`request.mode === 'navigate'`), use network-first with cache fallback
- For other static assets, keep stale-while-revalidate

This ensures that after any publish, the browser fetches the latest `index.html` from the network, which references the correct JS bundle with env vars embedded.

