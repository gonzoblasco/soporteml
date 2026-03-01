

# Plan: Epic 2 (v1.2) — Catálogo "Zero-Friction" + Quality Loop IA ↔ CRM

4 deliverables, ordered by user impact. No DB migration needed.

---

## 2.1 — Editar/Crear ficha CRM desde la conversación (Drawer sin perder contexto)

**Problem**: User navigates away from Inbox to edit catalog, loses conversation context.

**Solution**: Open ProductForm in a Sheet/Drawer overlay from QuestionDetail.

### Changes:
- **`src/components/catalog/ProductFormDrawer.tsx`** (new): Wrapper that renders `ProductForm` inside a `Sheet` (desktop) or `Drawer` (mobile). Accepts `productId` or `newProductParams` (meli_item_id, title, permalink) for create mode.
- **`src/components/ProductSideCard.tsx`**: 
  - When CRM product exists with `support_summary`: show CRM knowledge summary (key_points count, completeness badge), CTA "Editar ficha CRM" → opens drawer.
  - When CRM product exists but incomplete: CTA "Completar ficha (faltan N campos)" → opens drawer at the tab with missing fields.
  - When no CRM product but `meli_item_id` exists: CTA "Crear ficha CRM" → opens drawer in create mode, prefilled.
- **`src/components/QuestionDetail.tsx`**: Add state for drawer open/close, render `ProductFormDrawer`. Pass `product_id` from question. "Draft guard": preserve textarea content across drawer open/close (already state-based, just don't unmount).
- **`src/components/AICopilotPanel.tsx`**: Pass `product_id` to the `ai-copilot` edge function call (already accepted by backend, just not sent from frontend).

### UX:
- Sheet slides from right, overlays but doesn't replace conversation.
- Close → back to exact same state (answer draft preserved).
- After save in drawer → toast "Listo — actualizado", drawer stays open.

---

## 2.2 — Auto-create draft product on sync (zero-friction catalog growth)

**Problem**: Products only get CRM entries when manually created. Most questions reference products with no CRM data.

**Solution**: Already handled — `fetchAndStoreProduct` in sync creates products. But the **CRM knowledge fields remain empty**. No code change needed here, the existing flow already creates the product row. The real fix is 2.1 (making it easy to complete from conversation).

No changes for this sub-epic — it's already working via sync. The "Incompleto" badge from `CompletenessIndicator` already signals this.

---

## 2.3 — Quality Loop: Copilot suggests CRM improvements

**Problem**: User doesn't know which products need CRM data until they manually check.

**Solution**: After Copilot generates a response, show actionable CRM improvement suggestions.

### Changes:
- **`supabase/functions/ai-copilot/index.ts`**: Add a `crm_suggestions` field to the response. If `product_id` exists but CRM data is sparse (no `support_summary`, empty `key_points`, missing policies), include suggestions like "Completá el resumen de soporte para respuestas más precisas". If no `product_id`, suggest "Creá una ficha CRM para este producto". Logic is deterministic (not AI-generated) — just check which fields are empty.
- **`src/components/AICopilotPanel.tsx`**: Render `crm_suggestions` as a subtle callout below the draft, with CTA buttons that open the ProductFormDrawer at the relevant tab.

---

## 2.4 — Completeness score as first-class CRM metric

**Problem**: `CompletenessIndicator` exists but only in catalog. Not visible from Inbox or at product list level.

**Solution**: Surface completeness everywhere products appear.

### Changes:
- **`src/components/ProductSideCard.tsx`**: Show `CompletenessIndicator` badge when CRM product data is available.
- **`src/components/catalog/ProductList.tsx`**: Show completeness badge per product row (already has access to the data, just render the component).

---

## Files summary

| Action | File |
|--------|------|
| Create | `src/components/catalog/ProductFormDrawer.tsx` |
| Modify | `src/components/ProductSideCard.tsx` — CRM knowledge card + CTAs + drawer trigger |
| Modify | `src/components/QuestionDetail.tsx` — drawer state + render ProductFormDrawer |
| Modify | `src/components/AICopilotPanel.tsx` — pass product_id + render crm_suggestions |
| Modify | `supabase/functions/ai-copilot/index.ts` — add crm_suggestions to response |
| Modify | `src/components/catalog/ProductList.tsx` — completeness badge per row |
| Modify | `CHANGELOG.md` |

No database migration required. No new edge functions.

