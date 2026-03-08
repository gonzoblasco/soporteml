

## Hito 1: Tabla `memberships` — Base para Multi-Company

### Resumen

Crear la tabla `memberships` como fundamento para el futuro multi-company, migrar los datos existentes, y agregar helpers SQL. La app sigue usando `profiles.company_id` + `user_roles` sin cambios en UI ni lógica de frontend.

---

### 1. Migración SQL

Una sola migración que hace todo de forma atómica:

**a) Crear tabla `memberships`**

```sql
CREATE TABLE public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'agent',
  status text NOT NULL DEFAULT 'active',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);
```

**b) Trigger de validación de status**

```sql
CREATE FUNCTION validate_membership_status() ...
-- Rechaza si status NOT IN ('active', 'invited', 'disabled')
```

**c) Trigger `updated_at`** reutilizando `update_updated_at_column()`.

**d) Constraint parcial para `is_default`** — un único partial unique index:

```sql
CREATE UNIQUE INDEX idx_memberships_one_default_per_user 
  ON public.memberships (user_id) WHERE is_default = true;
```

Esto garantiza a nivel DB que solo haya una membership default por usuario.

**e) RLS policies**

- SELECT: usuarios ven sus propias memberships (`user_id = auth.uid()`)
- SELECT: super admin ve todas
- INSERT/UPDATE/DELETE: solo super admin (por ahora, las mutaciones las hace el sistema)

**f) Migración de datos existentes**

```sql
INSERT INTO public.memberships (user_id, company_id, role, status, is_default)
SELECT 
  p.id,
  p.company_id,
  COALESCE(ur.role, 'agent'),
  'active',
  true
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
WHERE p.company_id IS NOT NULL;
```

### 2. Funciones SQL Helper

Tres funciones `SECURITY DEFINER`:

| Función | Retorna | Descripción |
|---|---|---|
| `get_user_active_companies(_user_id uuid)` | `TABLE(company_id uuid, role app_role)` | Companies activas del usuario |
| `get_user_default_company(_user_id uuid)` | `uuid` | Company default del usuario (fallback a primera activa) |
| `user_belongs_to_company(_user_id uuid, _company_id uuid)` | `boolean` | Valida membership activa |

Estas funciones **no reemplazan** `get_user_company_id` todavía — coexisten para el siguiente hito.

### 3. Lo que NO cambia

- `profiles.company_id` se mantiene intacto
- `user_roles` se mantiene intacto
- `get_user_company_id()` sigue siendo la fuente para RLS
- Todas las RLS policies existentes sin cambios
- Frontend sin cambios
- Edge functions sin cambios

### 4. CHANGELOG

Entrada `[1.5.0]` documentando la tabla, migración de datos, helpers, y la nota de compatibilidad temporal.

### Archivos afectados

| Archivo | Cambio |
|---|---|
| Nueva migración SQL | Tabla + triggers + index + RLS + datos + helpers |
| `CHANGELOG.md` | Entrada v1.5.0 |

