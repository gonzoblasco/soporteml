

## Plan: Settings completo

### Estado actual
La página Settings tiene dos cards: conexion MercadoLibre (funcional, excepto desconectar) y un placeholder de "Cuenta". Necesitamos expandirla a 5 secciones.

### Cambios planificados

---

### 1. Base de datos

**Nueva tabla `company_settings`** para almacenar configuracion de IA por empresa:
- `company_id` (PK, FK a companies)
- `ai_tone` (text, default 'profesional') - tono de las respuestas
- `ai_custom_instructions` (text, nullable) - instrucciones custom
- `created_at`, `updated_at`
- RLS: admins de la empresa pueden SELECT y UPDATE

**Nueva policy UPDATE en `companies`** para que admins puedan editar el nombre.

**Nueva policy UPDATE en `profiles`** (ya existe para el propio usuario).

**Nueva policy en `meli_tokens`**: DELETE para admins de la empresa (para desconexion real).

**Nuevas policies en `profiles`**: INSERT de admin para invitar usuarios (asignarles company_id).

---

### 2. Edge function: `disconnect-meli`

Endpoint simple que recibe el `company_id` del usuario autenticado, valida que sea admin, y borra el registro de `meli_tokens` usando service role.

---

### 3. Edge function: actualizar `sync-meli-questions`

Modificar el system prompt de la IA para que lea las instrucciones custom desde `company_settings` en lugar del prompt hardcodeado actual.

---

### 4. UI: Reestructura de `SettingsPage.tsx`

Reorganizar en secciones con tabs o simplemente cards apiladas:

**Card 1 - Perfil del usuario**
- Mostrar email (readonly)
- Campo editable: nombre completo
- Boton cambiar contraseña (usa `supabase.auth.updateUser`)

**Card 2 - Empresa**
- Campo editable: nombre de la empresa
- Solo visible/editable para admins

**Card 3 - MercadoLibre** (existente, mejorado)
- Mantener flujo OAuth actual
- Reemplazar toast de "contactar soporte" por llamada real a `disconnect-meli`
- Agregar confirmacion con AlertDialog antes de desconectar

**Card 4 - Equipo** (solo admins)
- Lista de miembros de la empresa (profiles + user_roles donde company_id coincide)
- Mostrar nombre, email, rol (admin/agent)
- Boton para cambiar rol de un usuario
- Invitar usuario: por ahora solo mostrar los existentes (invitar requiere un flow de invitacion que se puede agregar despues)

**Card 5 - Configuracion de IA** (solo admins)
- Selector de tono: profesional, casual, tecnico
- Textarea de instrucciones custom (max 500 chars)
- Guardar en `company_settings`

---

### 5. AuthContext update

Agregar `userRole` al contexto para saber si el usuario es admin o agent, necesario para mostrar/ocultar secciones.

---

### Detalle tecnico

```text
SettingsPage
  |-- ProfileSection        (todos los usuarios)
  |     edit full_name, change password
  |
  |-- CompanySection         (solo admin)
  |     edit company name
  |
  |-- MeliConnectionSection  (solo admin)
  |     connect/disconnect OAuth
  |
  |-- TeamSection            (solo admin)
  |     list members, change roles
  |
  |-- AiConfigSection        (solo admin)
        tone selector, custom instructions
```

Migracion DB -> Edge function disconnect-meli -> Actualizar sync-meli-questions -> UI components -> AuthContext con role

