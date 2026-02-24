

## Plan: Panel de Super Admin

### Contexto
El super admin (gonzoblasco@icloud.com) necesita un panel exclusivo para ver las consultas del landing y gestionar cuentas de clientes (companies). Actualmente no existe ninguna página de administración global; toda la gestión está scoped a la company del usuario.

### Enfoque
Crear una nueva página `/admin` protegida por rol, accesible solo para usuarios con rol `admin` cuyo email sea el del super admin. Esto se valida client-side para la UI, pero la seguridad real está en RLS (las tablas `contact_inquiries` ya permiten SELECT a authenticated, y `companies` se puede extender).

### Cambios

**1. Nueva página `src/pages/AdminPanel.tsx`**

Dos secciones con tabs:

**Tab 1: Consultas recibidas**
- Tabla con nombre, email, mensaje, fecha de cada `contact_inquiries`
- Ordenadas por fecha descendente
- Botón para eliminar consultas ya procesadas

**Tab 2: Gestión de clientes (Companies)**
- Lista de todas las companies con: nombre, invite_code, fecha de creación, cantidad de miembros, estado de conexión MeLi
- Botón para crear nueva company manualmente (nombre → genera invite_code automático)
- Posibilidad de crear un usuario para esa company (signup vía edge function con service_role)

**2. Ruta en `src/App.tsx`**
- Agregar ruta `/admin` dentro del bloque protegido, con un guard adicional que verifica que el email del usuario sea `gonzoblasco@icloud.com`

**3. Link en sidebar `src/components/AppSidebar.tsx`**
- Agregar item "Admin" con icono `Shield` al final del nav, visible solo si el email del usuario es `gonzoblasco@icloud.com`

**4. Migración SQL -- RLS para que el super admin pueda listar TODAS las companies**
- Crear una policy SELECT en `companies` que permita a usuarios con rol admin leer todas las rows (no solo la propia). Usar `has_role(auth.uid(), 'admin')` pero restringido al super admin. Opción más simple: crear una función `is_super_admin()` que chequee el email, o simplemente usar `has_role` ya que solo hay un admin global.

```sql
-- Policy para que admins puedan ver todas las companies (para el panel admin)
CREATE POLICY "Super admin can view all companies"
  ON public.companies FOR SELECT
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'gonzoblasco@icloud.com'
  );

-- Policy para que el super admin pueda insertar companies
CREATE POLICY "Super admin can insert companies"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'gonzoblasco@icloud.com'
  );

-- Policy para que el super admin pueda eliminar consultas procesadas
CREATE POLICY "Super admin can delete inquiries"
  ON public.contact_inquiries FOR DELETE
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'gonzoblasco@icloud.com'
  );
```

**5. Edge function `create-client-account` (opcional, v2)**
- Para crear usuarios directamente desde el panel admin usando `supabase.auth.admin.createUser()`. Esto requiere service_role y se puede agregar después. Por ahora, el flujo sería: crear company → copiar invite_code → compartir link de signup.

### Archivos a crear/modificar
- `src/pages/AdminPanel.tsx` -- nueva página
- `src/App.tsx` -- agregar ruta `/admin`
- `src/components/AppSidebar.tsx` -- agregar link Admin condicional
- Migración SQL -- policies para super admin

### Notas técnicas
- El email del super admin se hardcodea como constante en el frontend para mostrar/ocultar UI, pero la seguridad real está en las policies RLS del backend que también verifican el email
- Se usa `auth.users.email` en las policies (lectura directa de la tabla auth, permitida en policies RLS)
- La tabla `contact_inquiries` ya tiene SELECT para authenticated; la policy de DELETE es nueva
- No se necesitan nuevas tablas

