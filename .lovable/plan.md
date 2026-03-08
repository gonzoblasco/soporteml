

## Hito 2: Compañía Activa en Frontend

### Resumen

Extender `AuthContext` para cargar memberships desde la DB, exponer `currentCompanyId` (con persistencia en localStorage), y proveer un setter con validación. El valor legacy `companyId` (de `profiles`) se mantiene como alias temporal.

---

### 1. Cambios en `AuthContext.tsx`

**Nuevos campos en el interface:**

```typescript
interface Membership {
  company_id: string;
  role: AppRole;
  is_default: boolean;
}

interface AuthContextType {
  // ... existentes ...
  memberships: Membership[];
  currentCompanyId: string | null;
  setCurrentCompanyId: (id: string) => void;
}
```

**Lógica al cargar sesión (dentro del `setTimeout` existente):**

1. Fetch memberships activas: `supabase.from('memberships').select('company_id, role, is_default').eq('user_id', uid).eq('status', 'active')`
2. Determinar `currentCompanyId`:
   - Leer `localStorage.getItem('sml_current_company')`
   - Si existe y es una membership activa del usuario → usar ese
   - Si no → usar membership con `is_default = true`
   - Si no hay default → usar primera activa
   - Si no hay ninguna → fallback a `profiles.company_id` (compatibilidad)
3. Setear `companyId = currentCompanyId` para que todo el código existente que usa `companyId` siga funcionando sin cambios
4. Setear `userRole` desde la membership activa (en vez de `user_roles`), con fallback a `user_roles` por compatibilidad

**Setter `setCurrentCompanyId`:**

```typescript
const switchCompany = useCallback((newId: string) => {
  const membership = memberships.find(m => m.company_id === newId);
  if (!membership) {
    // Invalid: reset to default
    const defaultId = memberships.find(m => m.is_default)?.company_id 
      ?? memberships[0]?.company_id ?? null;
    if (defaultId) {
      localStorage.setItem('sml_current_company', defaultId);
      setCompanyId(defaultId);
      setCurrentCompanyId(defaultId);
    }
    return;
  }
  localStorage.setItem('sml_current_company', newId);
  setCompanyId(newId); // mantiene compatibilidad
  setCurrentCompanyIdState(newId);
  setUserRole(membership.role);
}, [memberships]);
```

**Al logout:** limpiar `localStorage.removeItem('sml_current_company')` y resetear memberships.

### 2. Compatibilidad

- `companyId` en el context sigue existiendo y apunta a `currentCompanyId`
- Todos los componentes que hacen `const { companyId } = useAuth()` funcionan sin cambios
- Las RLS siguen usando `get_user_company_id()` (lee `profiles.company_id`) -- sin cambios en DB
- No se cambian Edge Functions ni RLS policies

### 3. Lo que NO cambia

- No hay company switcher UI todavía
- No hay migración de DB
- No se tocan Edge Functions
- No se modifican RLS policies
- No se cambian componentes de UI (solo AuthContext)

### 4. CHANGELOG

Entrada `[1.6.0]` documentando:
- Introducción de compañía activa en frontend context
- Memberships como fuente de companies del usuario
- Persistencia en localStorage
- Validación al cambiar compañía
- `companyId` sigue como alias de compatibilidad

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/contexts/AuthContext.tsx` | Agregar memberships, currentCompanyId, setter, persistencia, validación |
| `CHANGELOG.md` | Entrada v1.6.0 |

