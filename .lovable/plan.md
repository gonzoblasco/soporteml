

# Plan: Epic 1 — Catálogo de Productos CRM + Addendum Multi-fuente

## Phase 1: Database Migration

Single migration with:

### 1.1 ALTER `products`
- Add: `sku` (text, nullable, indexed), `status` (text, default `'active'`), `source` (text, default `'meli'`), `external_id` (text, nullable), `external_url` (text, nullable)
- Add CRM knowledge fields: `support_summary` (text), `key_points` (jsonb, default `'[]'`), `shipping_notes` (text), `returns_notes` (text), `warranty_notes` (text), `faq_bullets` (jsonb, default `'[]'`), `do_not_say` (jsonb, default `'[]'`)
- Add: `updated_at` (timestamptz, default `now()`), `updated_by` (uuid, nullable)
- Populate `source='meli'` and `external_id=meli_item_id` for existing rows
- Unique constraint: `(company_id, source, external_id)` WHERE `external_id IS NOT NULL`
- Index: `(company_id, sku)`
- Make `meli_item_id` nullable (future manual products won't have one)
- Validation trigger for `status IN ('active','archived')`
- Auto-update trigger for `updated_at`
- Update RLS: allow agents (not just admins) to insert/update products

### 1.2 CREATE `product_variants`
- Columns: `id`, `company_id`, `product_id` (FK), `variant_name`, `variant_sku`, `attributes` (jsonb), `support_notes`, `archived_at`, `created_at`, `updated_at`, `updated_by`
- RLS: company-scoped SELECT for all, INSERT/UPDATE/DELETE for admin+agent
- Auto-update trigger for `updated_at`

### 1.3 CREATE `audit_logs`
- Columns: `id`, `company_id`, `actor_user_id`, `entity_type`, `entity_id`, `action`, `before_snapshot` (jsonb), `after_snapshot` (jsonb), `created_at`
- RLS: company-scoped SELECT only
- INSERT via service role or edge function (no user INSERT policy — logs are write-only from backend)

### 1.4 Enable realtime on `products`

---

## Phase 2: Frontend — CRM Shell + Catalog Page

### 2.1 Routing & Sidebar
- Add `/catalog` route in `App.tsx` (maps to CatalogPage)
- In `AppSidebar.tsx`: replace single "Catálogo" item with a collapsible "CRM" group:
  - **Productos** → `/catalog` (active)
  - **Clientes** → disabled, badge "Próximamente"
  - **Órdenes** → disabled, badge "Próximamente"
  - **Conocimiento** → disabled, badge "Próximamente"

### 2.2 `CatalogPage.tsx` — Split-view CRM
**Left panel (`ProductList.tsx`)**:
- Search by title, SKU, meli_item_id/external_id
- Filter chips: Active / Archived / Incomplete (missing `support_summary`)
- Sort: Alphabetical, Last updated
- "Nuevo producto" button
- Empty states (no products, no results)

**Right panel (`ProductForm.tsx`)** — 5 tabs:
1. **Resumen**: title, source (read-only for meli), external_id, SKU, permalink, completeness badge
2. **Conocimiento IA**: support_summary (textarea), key_points (editable list), faq_bullets (editable list), do_not_say (editable list)
3. **Variantes**: toggle + inline editable table (`VariantsTable.tsx`): name, attributes (chips), notes. Add/archive variants
4. **Políticas**: shipping_notes, returns_notes, warranty_notes
5. **Actividad** (`AuditTimeline.tsx`): timeline from `audit_logs`, filtered by entity

### 2.3 CRUD + UX patterns
- Archive = `status: 'archived'` + toast with Undo (3s window)
- Restore = `status: 'active'`
- Auto-save with subtle "Listo — actualizado" indicator
- Audit log helper function (`logAuditEntry`) — reusable for future CRM entities
- Insert audit_logs via edge function or service-role call

### 2.4 New components
- `src/components/catalog/ProductList.tsx`
- `src/components/catalog/ProductForm.tsx`
- `src/components/catalog/VariantsTable.tsx`
- `src/components/catalog/AuditTimeline.tsx`
- `src/components/catalog/CompletenessIndicator.tsx`
- `src/pages/CatalogPage.tsx`

---

## Phase 3: AI Copilot Integration

### 3.1 `ai-copilot/index.ts`
- When request includes `product_id`: query `products` + `product_variants` (service role)
- Build "Product Knowledge" block: `support_summary`, `key_points`, `shipping_notes`, `returns_notes`, `warranty_notes`, `faq_bullets`, `do_not_say`, variant details
- Append to system prompt

### 3.2 `ProductSideCard.tsx` enhancement
- If product has `support_summary`: show CRM knowledge card (summary + key points count + variants count)
- CTA: "Abrir en Catálogo" → `/catalog?product=<id>`
- If no CRM product but `meli_item_id` exists: CTA "Crear ficha CRM" → `/catalog?new=true&meli_item_id=<id>&title=<title>`

---

## Phase 4: Sync Integration

### 4.1 `sync-meli-questions/index.ts` — `fetchAndStoreProduct`
- Set `source='meli'`, `external_id=<item_id>`, `external_url=<permalink>` on new product inserts
- Preserve CRM fields on upsert (don't overwrite `support_summary`, `key_points`, etc.)

---

## Files summary

| Action | File |
|--------|------|
| Migration | `supabase/migrations/[ts]_catalog_crm.sql` |
| Create | `src/pages/CatalogPage.tsx` |
| Create | `src/components/catalog/ProductList.tsx` |
| Create | `src/components/catalog/ProductForm.tsx` |
| Create | `src/components/catalog/VariantsTable.tsx` |
| Create | `src/components/catalog/AuditTimeline.tsx` |
| Create | `src/components/catalog/CompletenessIndicator.tsx` |
| Modify | `src/App.tsx` — add `/catalog` route |
| Modify | `src/components/AppSidebar.tsx` — CRM group with placeholders |
| Modify | `src/components/ProductSideCard.tsx` — CRM card + CTAs |
| Modify | `supabase/functions/ai-copilot/index.ts` — product knowledge injection |
| Modify | `supabase/functions/sync-meli-questions/index.ts` — multi-source fields |
| Modify | `CHANGELOG.md` |
| Update | `.lovable/plan.md` |

