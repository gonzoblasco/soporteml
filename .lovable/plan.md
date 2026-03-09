

## Plan: Crear usuarios desde Admin con asignación de plan

### Resumen
Agregar botón "Crear usuario" en Admin > Usuarios. El super admin puede crear usuarios con o sin empresa, y asignar el Plan Base. El Plan Pro aparece visible pero deshabilitado ("Próximamente").

### Componentes

**1. Edge Function `admin-create-user`**
- Valida caller como super admin via `is_super_admin()`
- Usa `supabase.auth.admin.createUser()` con `email_confirm: true`
- Pasa `full_name` en `user_metadata`
- Si `company_id` + `role`: llama `add_company_membership` RPC
- Si `plan = 'base'`: crea Stripe customer + suscripción con `price_1T7faRHxJMYe1KhU6WFMGZBE`
- Si no hay plan: usuario sin suscripción

**2. UI en AdminPanel.tsx (UsersTab)**
- Botón "Crear usuario" junto al buscador
- Dialog con campos:
  - Nombre completo (required)
  - Email (required)  
  - Contraseña (required, min 6)
  - Empresa (optional select)
  - Rol (admin/agent, solo si empresa seleccionada)
  - Plan: "Sin plan", "Plan Base - $100/mes" (activo), "Plan Pro - $200/mes" (disabled, badge "Próximamente")
- Submit invoca edge function, refresh lista + toast

**3. Config y changelog**
- Agregar `admin-create-user` a `supabase/config.toml`
- Actualizar `CHANGELOG.md`

### Archivos
- **Crear**: `supabase/functions/admin-create-user/index.ts`
- **Modificar**: `src/pages/AdminPanel.tsx`
- **Modificar**: `supabase/config.toml`
- **Modificar**: `CHANGELOG.md`

