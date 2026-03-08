

## Hito 2: Compañía Activa — Multi-Company Context en Frontend

### Objetivo

Introducir el concepto de "compañía activa" en el frontend, permitiendo que un usuario con múltiples memberships pueda trabajar sobre una sola a la vez, sin rehacer toda la UI ni cambiar las integraciones actuales.

---

### 1. Modificaciones al AuthContext

**Archivo:** `src/contexts/AuthContext.tsx`

#### Nuevos tipos e interfaces

```typescript
interface Company {
  id: string;
  name: string;
  role: 'admin' | 'agent';
}

interface AuthContextType {
  // ... campos existentes
  companies: Company[];          // NEW: lista de companies del usuario
  currentCompanyId: string | null; // NEW: company activa
  setCurrentCompany: (companyId: string) => void; // NEW: cambiar company
}
```

#### Lógica de carga

En el `useEffect` que escucha `onAuthStateChange`:

1. **Cargar memberships activas** del usuario:
   ```typescript
   const { data: memberships } = await supabase
     .from('memberships')
     .select('company_id, role, is_default, companies(name)')
     .eq('user_id', session.user.id)
     .eq('status', 'active')
     .order('is_default', { ascending: false });
   ```

2. **Transformar a array de `Company`**

3. **Determinar `currentCompanyId`**:
   - Leer de `localStorage.getItem('current_company_id')`
   - Si existe y pertenece a las companies activas → usar ese
   - Si no, buscar la membership con `is_default = true`
   - Si no hay default, usar la primera del array
   - Si no hay memberships, null

4. **Guardar en localStorage** cuando cambie `currentCompanyId`

5. **Sincronizar campos legacy**:
   - `companyId = currentCompanyId` (para compatibilidad)
   - `userRole` = role de la membership activa

#### Función `setCurrentCompany`

```typescript
const setCurrentCompany = useCallback((newCompanyId: string) => {
  // Validar que pertenece al usuario
  const valid = companies.find(c => c.id === newCompanyId);
  if (!valid) {
    console.error('Invalid company ID');
    // Resetear a default
    const defaultCompany = companies.find(c => c.isDefault) || companies[0];
    setCurrentCompanyId(defaultCompany?.id || null);
    return;
  }
  
  setCurrentCompanyId(newCompanyId);
  localStorage.setItem('current_company_id', newCompanyId);
}, [companies]);
```

#### Compatibilidad

- `companyId` se mantiene como alias de `currentCompanyId`
- El resto de la app sigue usando `companyId` sin cambios
- Las RLS policies siguen usando `profiles.company_id` por ahora
- Esto permite que el Hito 2 sea **no-breaking**

---

### 2. Persistencia

- Usar `localStorage.getItem('current_company_id')` al iniciar
- Usar `localStorage.setItem('current_company_id', id)` al cambiar
- Clear en logout

---

### 3. Validación

- Al cargar, verificar que el ID guardado en localStorage esté en la lista de companies activas
- Si no es válido, resetear a default o primera activa
- Al cambiar vía `setCurrentCompany`, validar que pertenezca al array `companies`

---

### 4. Lo que NO cambia

- UI: sin company switcher visible todavía
- RLS: sigue usando `profiles.company_id` como fuente
- Edge functions: sin cambios
- Integraciones: MeLi sigue 1:1 por company
- Rutas, páginas, componentes: sin cambios visuales

---

### 5. Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/contexts/AuthContext.tsx` | Agregar `companies`, `currentCompanyId`, `setCurrentCompany` |
| `CHANGELOG.md` | Entrada v1.6.0 |

---

### 6. CHANGELOG

Entrada **[1.6.0]** documentando:
- Introducción de compañía activa en frontend
- Persistencia de contexto en localStorage
- Compatibilidad temporal con `profiles.company_id`
- Sin cambios visuales ni de UI todavía

---

### Beneficio

Este hito prepara el terreno para introducir un **company switcher** en futuros hitos sin reescribir toda la lógica de autenticación.

