

# Plan de Cierre: Epic Multi-Company v2.0

## Verificación de pendientes

Confirmados **3 archivos/funciones** con uso residual del modelo legacy:

### Frontend
- **`TemplatePicker.tsx`** (línea 18): usa `companyId` del contexto
- **`AICopilotPanel.tsx`** (línea 38): usa `companyId` del contexto  
- **`SettingsPage.tsx`** (líneas 689, 1053): 2 secciones internas (`AiConfigSection`, `TrashSection`) usan `companyId`

### Backend
- **`get_admin_users()`**: query `profiles.company_id` en vez de `memberships`
- **`get_admin_company_metrics()`**: cuenta miembros usando `profiles.company_id` en vez de `memberships`

### Documentación
- **CHANGELOG.md**: versión 1.9.0 está vacía (línea 39), debería fusionarse o completarse

## Tareas de cierre

### 1. Migración de componentes frontend (3 archivos)

**TemplatePicker.tsx**
```tsx
// Línea 18: reemplazar
const { companyId } = useAuth();
// por
const { currentCompanyId } = useAuth();

// Línea 24, 28, 31: reemplazar todas las referencias
companyId → currentCompanyId
```

**AICopilotPanel.tsx**
```tsx
// Línea 38: reemplazar
const { companyId } = useAuth();
// por
const { currentCompanyId } = useAuth();

// Todas las referencias subsiguientes (verificar líneas 62, 74, etc.)
companyId → currentCompanyId
```

**SettingsPage.tsx**
```tsx
// Línea 689 (AiConfigSection): reemplazar
const { companyId } = useAuth();
// por
const { currentCompanyId } = useAuth();

// Línea 1053 (TrashSection): reemplazar
const { companyId } = useAuth();
// por
const { currentCompanyId } = useAuth();

// Actualizar todas las referencias en ambas secciones
```

### 2. Actualización de funciones SQL (2 funciones)

**get_admin_users()**

Cambiar query principal para reflejar memberships:

```sql
-- Antes: junta profiles.company_id + user_roles.role
-- Después: agregar columnas de memberships y mostrar TODAS las companies del usuario

RETURN QUERY
SELECT
  p.id AS user_id,
  u.email::text,
  p.full_name,
  -- Array de companies como JSONB para usuarios multi-company
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'company_id', m.company_id,
        'company_name', c.name,
        'role', m.role,
        'is_default', m.is_default
      ) ORDER BY m.is_default DESC, m.created_at ASC
    ) FILTER (WHERE m.company_id IS NOT NULL),
    '[]'::jsonb
  ) AS memberships,
  -- Mantener company_id legacy (primera membership o profiles.company_id)
  COALESCE(
    (SELECT m2.company_id FROM memberships m2 
     WHERE m2.user_id = p.id AND m2.status = 'active' 
     ORDER BY m2.is_default DESC, m2.created_at ASC LIMIT 1),
    p.company_id
  ) AS company_id,
  -- Rol legacy (primera membership o user_roles)
  COALESCE(
    (SELECT m3.role FROM memberships m3 
     WHERE m3.user_id = p.id AND m3.status = 'active' 
     ORDER BY m3.is_default DESC, m3.created_at ASC LIMIT 1),
    ur.role
  )::text AS role,
  p.created_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
LEFT JOIN public.memberships m ON m.user_id = p.id AND m.status = 'active'
LEFT JOIN public.companies c ON c.id = m.company_id
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
GROUP BY p.id, u.email, p.full_name, p.company_id, p.created_at, ur.role
ORDER BY p.created_at DESC;
```

Impacto: AdminPanel ahora muestra correctamente usuarios con múltiples companies como badges clickeables.

**get_admin_company_metrics()**

Reemplazar subquery de `member_count`:

```sql
-- Antes
LEFT JOIN (
  SELECT p.company_id, COUNT(*)::bigint AS cnt
  FROM public.profiles p WHERE p.company_id IS NOT NULL
  GROUP BY p.company_id
) pm ON pm.company_id = c.id

-- Después
LEFT JOIN (
  SELECT m.company_id, COUNT(DISTINCT m.user_id)::bigint AS cnt
  FROM public.memberships m 
  WHERE m.status = 'active'
  GROUP BY m.company_id
) pm ON pm.company_id = c.id
```

Impacto: conteo correcto de miembros activos, usuarios multi-company se cuentan correctamente en cada empresa.

### 3. Ajuste de CHANGELOG (mínimo)

Fusionar versión 1.9.0 vacía con 1.7.0 o eliminarla para mantener coherencia histórica.

```markdown
## [1.9.0] — 2026-03-09

### 🏢 Multi-Company — Hito 5: Admin & Invites

#### Añadido
- **Funciones RPC de membership management**: `add_company_membership`, `remove_company_membership`, `update_membership_role`, `get_company_members`, `join_company_by_invite`
- **AdminPanel Users tab**: rediseñado para mostrar memberships múltiples por usuario con badges interactivos
- **Settings > Join Company**: nueva sección para que usuarios se unan a empresas adicionales vía invite code
- **`refreshMemberships()` en AuthContext**: permite refrescar lista de companies del usuario sin logout

#### Cambiado
- **Team Section en Settings**: scope estricto a `currentCompanyId` usando `get_company_members` RPC
- **CompaniesTab**: asignación de admin inicial al crear company usa `add_company_membership`
```

Actualizar versión 2.0.0 con nota de cierre del epic:

```markdown
## [2.0.0] — 2026-03-09

### 🏢 Multi-Company — Cierre del Epic (Hitos 1-6)

#### Cambiado
- **Frontend migrado completamente a `currentCompanyId`**: todos los componentes (incluyendo TemplatePicker, AICopilotPanel, y secciones internas de Settings) ahora usan `currentCompanyId`.
- **Backend migrado a memberships**: funciones admin (`get_admin_users`, `get_admin_company_metrics`) leen desde `memberships` en vez de `profiles.company_id`.
- **`companyId` oficialmente deprecated**: alias legacy será removido en v2.1.0.

#### Epic completado
El sistema multi-company está cerrado y operativo con:
- ✅ Memberships como fuente única de verdad
- ✅ Switcher UI funcional para cambio de tenant
- ✅ Isolation estricto por `currentCompanyId`
- ✅ Admin panel adaptado a multi-company
- ✅ Invite flow compatible con múltiples memberships
- ✅ RLS y edge functions usando `get_user_company_id()` con fallback
```

## Alcance de cambios

### Archivos tocados
- `src/components/TemplatePicker.tsx`
- `src/components/AICopilotPanel.tsx`
- `src/pages/SettingsPage.tsx`
- `supabase/migrations/<nueva_migration>.sql` (2 funciones SQL)
- `CHANGELOG.md`

### Funciones SQL modificadas
- `get_admin_users()` — nueva estructura de retorno con memberships
- `get_admin_company_metrics()` — conteo desde memberships

### Qué NO se toca
- ✅ AuthContext (sin cambios)
- ✅ Edge Functions (sin cambios)
- ✅ Invite flow (`handle_new_user`, `join_company_by_invite` funcionan correctamente)
- ✅ RLS policies (ya migradas en Hito 3)
- ✅ Lógica MercadoLibre (sin cambios)
- ✅ Otras pantallas principales (ya migradas en Hito 6)

## Resultado esperado

**Epic Multi-Company oficialmente cerrado** en versión 2.0.0 con:
- 0 referencias a `companyId` legacy fuera del alias deprecated en AuthContext
- Backend completamente basado en `memberships`
- Documentación coherente del epic completo
- Sistema listo para operación multi-tenant

## Observaciones adicionales detectadas

No se encontraron otros pendientes técnicos bloqueantes. Sistema consistente tras estos cierres.

