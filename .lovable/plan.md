

## Hito 3: Backend de Seguridad — Memberships como Fuente de Verdad

### Diagnóstico actual

**Lo que usa `profiles.company_id` y hay que migrar:**
- 12 tablas con RLS que usan `get_user_company_id(auth.uid())` (lee de `profiles`)
- 4 edge functions que leen `profiles.company_id` directamente via service client: `ai-copilot`, `enrich-product`, `detect-duplicates`, `meli-item-proxy`
- `handle_new_user()` trigger: no inserta en `memberships` al crear usuario

**Lo que ya está correcto:**
- `sync-meli-questions`, `publish-meli-answer`, `disconnect-meli`: ya usan `rpc("get_user_company_id")`
- Frontend: `CatalogPage`, `SettingsPage`, `TemplatesPage` ya filtran por `companyId`
- `Inbox.tsx` y `PriorityInbox.tsx`: sin filtro explícito de `company_id` — dependen solo de RLS

---

### 1. Migración SQL (1 archivo)

**a) Nueva función `get_user_company_ids()`** — retorna todas las companies activas del usuario:
```sql
CREATE FUNCTION get_user_company_ids(_user_id uuid)
RETURNS TABLE(company_id uuid) SECURITY DEFINER ...
  SELECT m.company_id FROM memberships WHERE user_id = _user_id AND status = 'active'
```

**b) Actualizar `get_user_company_id()`** — ahora lee de memberships con fallback a profiles:
```sql
COALESCE(
  get_user_default_company(_user_id),           -- lee de memberships
  (SELECT company_id FROM profiles WHERE id = _user_id) -- fallback temporal
)
```
Esto hace que `sync-meli-questions`, `publish-meli-answer` y `disconnect-meli` ya mejoren automáticamente.

**c) Nueva función `has_membership_role()`** — verifica rol por company:
```sql
CREATE FUNCTION has_membership_role(_user_id uuid, _company_id uuid, _role app_role)
RETURNS boolean SECURITY DEFINER ...
  EXISTS (SELECT 1 FROM memberships WHERE user_id=... AND company_id=... AND role=... AND status='active')
```

**d) Migrar RLS en todas las tablas** — reemplazar `get_user_company_id()` y `has_role()` con:
- `user_belongs_to_company(auth.uid(), company_id)` para aislamiento tenant
- `has_membership_role(auth.uid(), company_id, 'admin')` para comprobación de rol por company

Tablas afectadas: `companies`, `company_settings`, `questions`, `products`, `product_variants`, `templates`, `audit_logs`, `events`, `dismissed_meli_questions`, `meli_tokens`, `profiles`.

Excepción documentada: `user_roles` mantiene `has_role()` porque no tiene `company_id` (tabla legacy sin contexto de company).

**e) Actualizar `handle_new_user()`** — agregar `INSERT INTO memberships` cuando se asigna company:
```sql
-- En el flow de nueva empresa y de invite_code:
INSERT INTO memberships (user_id, company_id, role, status, is_default)
VALUES (NEW.id, _company_id, 'admin'/'agent', 'active', true);
```
Cierra el gap donde usuarios nuevos quedan sin membership.

---

### 2. Edge Functions (4 funciones)

Patrón actual en `ai-copilot`, `enrich-product`, `detect-duplicates`, `meli-item-proxy`:
```typescript
// ❌ ANTES: lee profiles directamente
const { data: profile } = await serviceClient.from("profiles").select("company_id").eq("id", user.id).single();
const companyId = profile.company_id;
```

Cambio en los 4:
```typescript
// ✅ DESPUÉS: usa RPC que lee de memberships
const { data: companyId } = await serviceClient.rpc("get_user_company_id", { _user_id: user.id });
if (!companyId) return 403 "No active membership found"
```

Beneficio: el RPC ya tiene fallback, no rompe compatibilidad, y valida membership activa.

---

### 3. Frontend (2 páginas)

**`Inbox.tsx` y `PriorityInbox.tsx`** — sin filtro explícito de company actualmente:

```typescript
// Agregar useAuth() y filtro:
const { currentCompanyId } = useAuth();
// En fetchQuestions:
let query = supabase.from('questions').select('...')
  .eq('company_id', currentCompanyId)  // ← nuevo
  .eq('status', statusFilter)
```

Sin este cambio, cuando un usuario tenga múltiples memberships, el RLS migrado (`user_belongs_to_company`) mostraría preguntas de TODAS sus companies mezcladas.

---

### 4. CHANGELOG v1.7.0

```text
- RLS migradas a user_belongs_to_company() + has_membership_role() en 11 tablas
- get_user_company_id() ahora lee de memberships con fallback a profiles.company_id
- Nueva función get_user_company_ids() y has_membership_role()
- handle_new_user() genera membership en alta de usuario
- 4 edge functions migradas a usar RPC en vez de profiles directamente
- Inbox y PriorityInbox filtran por currentCompanyId explícitamente
- has_role() se mantiene solo para user_roles (legacy, documentado)
- No se habilita trabajo cross-company simultáneo todavía
```

---

### Archivos afectados

| Archivo | Cambio |
|---|---|
| Nueva migración SQL | helpers + RLS + handle_new_user |
| `supabase/functions/ai-copilot/index.ts` | profiles → RPC |
| `supabase/functions/enrich-product/index.ts` | profiles → RPC |
| `supabase/functions/detect-duplicates/index.ts` | profiles → RPC |
| `supabase/functions/meli-item-proxy/index.ts` | profiles → RPC |
| `src/pages/Inbox.tsx` | filtro por currentCompanyId |
| `src/pages/PriorityInbox.tsx` | filtro por currentCompanyId |
| `CHANGELOG.md` | v1.7.0 |

### Garantías de compatibilidad

- `profiles.company_id` no se toca ni elimina
- `get_user_company_id()` mantiene fallback a `profiles.company_id`
- `has_role()` se mantiene para `user_roles`
- Para usuarios con 1 company (todos los actuales): comportamiento idéntico al actual
- No se habilita acceso cross-company simultáneo

