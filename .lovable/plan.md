

## Plan: Multi-usuario por compania con invite_code

### Cambios

### 1. Migracion de base de datos
- Agregar columna `invite_code` (text, unique) a `companies` con valor default aleatorio
- Generar codigos para empresas existentes
- Agregar policy INSERT en `companies` para que usuarios autenticados puedan crear empresas (necesario para el trigger)
- Reemplazar el trigger `handle_new_user` para manejar dos flujos:
  - Si metadata tiene `company_name`: crear empresa, asignar company_id al perfil, crear rol admin
  - Si metadata tiene `invite_code`: buscar empresa por codigo, asignar company_id, crear rol agent
  - Si no hay ninguno: crear perfil sin empresa (fallback actual)

### 2. AuthContext (`src/contexts/AuthContext.tsx`)
- Actualizar firma de `signup` para aceptar `companyName` e `inviteCode` opcionales
- Pasar esos valores como `user_metadata` en el signup

### 3. Login (`src/pages/Login.tsx`)
- En modo signup, agregar dos sub-modos con tabs: "Crear empresa" y "Unirme a una empresa"
- Tab "Crear empresa": campo nombre de empresa (requerido)
- Tab "Unirme": campo codigo de invitacion (requerido)
- Pasar el campo correspondiente al signup

### 4. Settings (`src/pages/SettingsPage.tsx`)
- En `CompanySection`: mostrar el invite_code actual con boton copiar
- Agregar boton "Regenerar codigo" que actualiza el invite_code en la DB

### Detalle tecnico

El trigger `handle_new_user` es SECURITY DEFINER, asi que puede insertar en `companies`, `profiles` y `user_roles` sin necesidad de RLS policies especificas para el trigger. Solo necesitamos asegurarnos de que el trigger tenga los permisos correctos.

```text
Signup flow:
  User fills form
    ├── "Crear empresa" tab → metadata: { company_name, full_name }
    │     └── Trigger: CREATE company → SET profile.company_id → INSERT admin role
    └── "Unirme" tab → metadata: { invite_code, full_name }
          └── Trigger: FIND company by code → SET profile.company_id → INSERT agent role
```

Archivos a modificar:
- `supabase/migrations/` → nueva migracion (invite_code + trigger actualizado)
- `src/contexts/AuthContext.tsx` → signup con company_name/invite_code
- `src/pages/Login.tsx` → tabs crear empresa / unirse con codigo
- `src/pages/SettingsPage.tsx` → mostrar/regenerar invite_code en CompanySection

