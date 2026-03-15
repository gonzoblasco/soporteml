## Flujos críticos cubiertos por tests

- **Flujo 1 – Autenticación y acceso al inbox**
  - Usuario accede al login, se autentica vía Supabase Auth y se resuelve el contexto de `AuthProvider` (`currentCompanyId`, `userRole`, memberships).
  - Una vez autenticado, el usuario puede navegar al inbox estándar (`/inbox`), donde:
    - Se listan preguntas de la tabla `questions` filtradas por `company_id` y `status` (`pending`, `published`, etc.).
    - Se aplican filtros de búsqueda y agrupación (`groupQuestions`).
    - Se abre el detalle de una pregunta (`QuestionDetail`) y se refresca la lista cuando se actualiza.

- **Flujo 2 – IA Copilot sobre una pregunta**
  - Desde el detalle de una pregunta, el usuario abre el panel `AICopilotPanel`.
  - El componente:
    - Resuelve configuración de IA (`company_settings.ai_tone`, `ai_custom_instructions`) usando `currentCompanyId`.
    - Invoca la Edge Function `ai-copilot` vía `supabase.functions.invoke('ai-copilot', {...})`.
    - Muestra resumen, borrador sugerido y checklist de datos faltantes.
    - Permite aplicar el borrador al editor de respuesta y manejar errores de la función.

- **Flujo 3 – Facturación y estado de suscripción**
  - En `SettingsPage`, la sección `BillingSection`:
    - Comprueba el estado de suscripción con `supabase.functions.invoke('check-subscription')`, con bypass para super admin.
    - Muestra el plan actual (o ausencia de suscripción) y fecha de renovación.
    - Lanza el flujo de checkout de Stripe mediante `supabase.functions.invoke('create-checkout')` y abre la URL devuelta.
    - Permite gestionar la suscripción existente mediante `supabase.functions.invoke('customer-portal')`.

- **Flujo 4 – Conexión y salud de Mercado Libre**
  - En `SettingsPage`, la sección `MeliConnectionSection`:
    - Muestra el estado de conexión (`meli_connection_status`) y la salud del token con `computeHealth`/`getHealthUI`.
    - Permite conectar Mercado Libre usando el flujo OAuth (PKCE, `meli-oauth-callback` en Supabase).
    - Permite forzar sincronización de preguntas (`sync-meli-questions`) y desconectar la cuenta (`disconnect-meli`).

Estos flujos serán la base prioritaria para:

- **Tests E2E**: autenticación + navegación a inbox; uso de IA Copilot; flujo mínimo de facturación.
- **Tests de componentes/API frontend**: comportamiento de `AICopilotPanel`, `BillingSection`, `MeliConnectionSection` y capa `api` que envuelva sus llamadas a Supabase/Edge Functions.

