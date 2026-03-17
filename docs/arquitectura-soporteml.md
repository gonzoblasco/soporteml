# SoporteML – Arquitectura y contexto del proyecto

## 1. Contexto general

- Proyecto originario de **Lovable**, con:
  - **Frontend**: React + TypeScript + Vite + Tailwind + shadcn/ui.
  - **Backend**: Supabase (PostgreSQL + Auth + Realtime + Edge Functions).
  - **IA**: funciones serverless que llaman al gateway de IA de Lovable.
  - **Pagos**: Stripe.
- Situación actual:
  - El **frontend se está desplegando fuera de Lovable** (autohosteado).
  - El **backend/serverless sigue en Lovable/Supabase**.
  - Objetivo a corto plazo: que el sistema funcione bien en este estado híbrido.
  - Objetivo a medio plazo (epic futuro): **migración 100% fuera de Lovable**.

---

## 2. Arquitectura general

### 2.1 Capas

- **Frontend (autohosteado)**
  - Código en `src/**`.
  - Entrypoint: `src/main.tsx`.
  - Routing y providers: `src/App.tsx`.
  - Estado remoto: `@tanstack/react-query`.
  - Routing: `react-router-dom`.
  - UI: Tailwind + shadcn/ui.

- **Backend / BBDD (Supabase en Lovable)**
  - Proyecto Supabase con id `ropbkdqhqdeiwrenrmjt`.
  - Config: `supabase/config.toml`.
  - Esquema y RLS: `supabase/migrations/*.sql`.

- **Edge Functions (serverless)**
  - Ubicación: `supabase/functions/**`, una carpeta por función.
  - Lógica de negocio:
    - IA: `ai-copilot`, `backfill-ai-answers`.
    - Mercado Libre: `meli-oauth-callback`, `meli-webhook`, `sync-meli-questions`, `disconnect-meli`, `meli-item-proxy`, `enrich-product`, `detect-duplicates`.
    - Billing: `create-checkout`, `check-subscription`, `customer-portal`.
    - Administración y otros: `auth-email-hook`, `admin-create-user`, `audit-log`, `notify`, `health-check`.

- **Servicios externos**
  - Mercado Libre API.
  - Stripe.
  - Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`).

### 2.2 Flujo típico usuario → backend

1. Usuario llega al frontend en tu dominio (hosting propio).
2. Front crea el cliente Supabase (`src/integrations/supabase/client.ts`) usando:
   - `VITE_SUPABASE_URL`.
   - `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. `AuthProvider` (`src/contexts/AuthContext.tsx`) gestiona sesión, perfiles, memberships y `currentCompanyId`.
4. Páginas y componentes usan:
   - `supabase.from(...)` para tablas.
   - `supabase.auth.*` para login/signup/sesiones.
   - `supabase.functions.invoke('<nombre>')` para lógica compleja.
   - `supabase.channel(...)` para Realtime (notificaciones de nuevas preguntas).
5. Edge Functions operan sobre la BBDD Supabase y servicios externos (Meli, Stripe, IA).

---

## 3. Estructura de carpetas relevante

### 3.1 Frontend

- Entrypoint:
  - `index.html`
  - `src/main.tsx`
  - `src/App.tsx`
- Configuración:
  - `vite.config.ts`
  - `tailwind.config.ts`
  - `tsconfig*.json`
- UI y navegación:
  - Layout principal: `src/components/DashboardLayout.tsx`
  - Sidebar & navegación: `src/components/AppSidebar.tsx`, `src/components/NavLink.tsx`
  - Páginas: `src/pages/*.tsx`
- Integración Supabase:
  - Cliente: `src/integrations/supabase/client.ts`
  - Tipos: `src/integrations/supabase/types.ts`
  - Auth & multi-empresa: `src/contexts/AuthContext.tsx`
  - Utilidades de dominio: `src/lib/**`

### 3.2 Backend / Supabase

- Config Supabase:
  - `supabase/config.toml` (project_id, funciones, `verify_jwt`).
- Esquema BBDD:
  - `supabase/migrations/*.sql`
- Edge Functions:
  - `supabase/functions/ai-copilot/index.ts`
  - `supabase/functions/sync-meli-questions/index.ts`
  - `supabase/functions/meli-oauth-callback/index.ts`
  - `supabase/functions/disconnect-meli/index.ts`
  - `supabase/functions/enrich-product/index.ts`
  - `supabase/functions/detect-duplicates/index.ts`
  - `supabase/functions/publish-meli-answer/index.ts`
  - `supabase/functions/audit-log/index.ts`
  - `supabase/functions/admin-create-user/index.ts`
  - `supabase/functions/create-checkout/index.ts`
  - `supabase/functions/customer-portal/index.ts`
  - `supabase/functions/check-subscription/index.ts`
  - `supabase/functions/notify/index.ts`
  - `supabase/functions/backfill-ai-answers/index.ts`
  - `supabase/functions/meli-item-proxy/index.ts`
  - `supabase/functions/auth-email-hook/index.ts`
  - `supabase/functions/health-check/index.ts`

---

## 4. Comunicación frontend ↔ backend

### 4.1 Cliente Supabase (base URL y claves)

- Archivo: `src/integrations/supabase/client.ts`
- Usa env vars:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
- Auth configurada con `localStorage`:
  - Ideal para front y back en dominios distintos.

### 4.2 Tipos de comunicación

- **Auth**: en `src/contexts/AuthContext.tsx`
  - `supabase.auth.signInWithPassword`
  - `supabase.auth.signUp`
  - `supabase.auth.getSession`
  - `supabase.auth.onAuthStateChange`
- **Datos (tablas)**:
  - `supabase.from('...').select/insert/update` desde distintos componentes/páginas.
- **Edge Functions** (funciones serverless):
  - Ejemplos:
    - `ai-copilot` (IA) – `src/components/AICopilotPanel.tsx`
    - `sync-meli-questions`, `disconnect-meli` – `src/components/settings/MeliConnectionSection.tsx`
    - `publish-meli-answer` – `src/components/QuestionDetail.tsx`
    - `enrich-product` – `src/components/catalog/EnrichButton.tsx`
    - `detect-duplicates` – `src/components/catalog/DuplicateDetector.tsx`
    - `audit-log` – `src/lib/auditLog.ts`
    - `admin-create-user` – `src/components/admin/CreateUserDialog.tsx`
    - `check-subscription`, `create-checkout`, `customer-portal` – `src/components/settings/BillingSection.tsx`
- **Realtime**:
  - `src/components/DashboardLayout.tsx` usando `supabase.channel('question-notifications')`.

### 4.3 CORS y callbacks externos

- `supabase/functions/ai-copilot/index.ts` define:

  ```ts
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, ..."
  };
  ```

- OAuth Mercado Libre:
  - `redirectUri` configurado en frontend como:
    - `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meli-oauth-callback`
  - Implica que el callback registrado en Meli debe seguir apuntando al dominio Supabase.

---

## 5. Dependencias clave de Lovable / Supabase

- Supabase como backend completo:
  - Cliente JS: `@supabase/supabase-js`
  - Proyecto `ropbkdqhqdeiwrenrmjt` (config + .env)
  - Tablas, RLS, funciones SQL en `supabase/migrations/*.sql`.
- Edge Functions:
  - Backend empaquetado en `supabase/functions/**`.
  - Nombres de función asumidos por el front (`supabase.functions.invoke('...')`).
- Lovable AI Gateway:
  - `supabase/functions/ai-copilot/index.ts` llama a `https://ai.gateway.lovable.dev/v1/chat/completions`
  - Usa `LOVABLE_API_KEY`.
- Tooling Lovable:
  - `lovable-tagger` en `vite.config.ts` (solo development).

---

## 6. Riesgos al tener frontend fuera y backend en Lovable

- **CORS**
  - Si alguna función no permite tu dominio/origen, verás errores CORS en consola.
- **Auth / configuración de env vars**
  - `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` incorrectos → 401/404 en todas las llamadas.
- **Callbacks externos (Meli, Stripe, etc.)**
  - `redirectUri` de Meli debe seguir apuntando a Supabase (`.../functions/v1/meli-oauth-callback`).
- **Realtime**
  - Posibles errores de conexión websockets si Supabase o tu hosting bloquean algo.
- **Claves de IA y Stripe**
  - `LOVABLE_API_KEY` mal configurada → errores en `ai-copilot`.
  - Claves Stripe mal configuradas → errores en `create-checkout`, `customer-portal`, etc.

---

## 7. Checklist rápida de validación del entorno híbrido

1. **Frontend (hosting actual)**
   - `VITE_SUPABASE_URL` apunta al proyecto correcto.
   - `VITE_SUPABASE_PUBLISHABLE_KEY` es la clave anon de ese proyecto.

2. **Supabase**
   - Proyecto `ropbkdqhqdeiwrenrmjt` activo.
   - Edge Functions desplegadas y sin errores graves en logs.
   - Variables de entorno necesarias (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`, Stripe, Meli) configuradas.

3. **Flujos críticos**
   - Login/Signup (`/login`, `/signup`) funcionan desde el dominio nuevo.
   - Inbox/Priority reciben nuevas preguntas en tiempo real.
   - IA Copilot responde correcto (`ai-copilot`).
   - Integración Meli (conexión, sync, disconnect) sin errores.
   - Billing (Stripe) funcionando (`check-subscription`, `create-checkout`, `customer-portal`).

---

## 8. Guía para una futura migración 100% fuera de Lovable

- **Aislar Supabase en el frontend**
  - Crear capa `src/api/**` que envuelva todas las llamadas a `supabase.*`.
  - Objetivo: que los componentes no conozcan detalles de Supabase.

- **Inventariar y documentar Edge Functions**
  - Para cada función en `supabase/functions/**`:
    - Nombre público (ruta).
    - Input esperado.
    - Output JSON.
  - Servirá como contrato para reimplementarlas en otro stack.

- **Plan por dominios**
  - IA (`ai-copilot`, `backfill-ai-answers`) → mover a servicio de IA propio.
  - Mercado Libre (`meli-*`, `sync-meli-questions`, `publish-meli-answer`) → microservicio Meli.
  - Billing (`create-checkout`, `customer-portal`, `check-subscription`) → servicio de billing.
  - Auditoría y administración (`audit-log`, `admin-create-user`, `auth-email-hook`) → servicio interno.

- **Capa de datos**
  - Analizar RLS y funciones SQL en `supabase/migrations/*.sql`.
  - Decidir qué se lleva a Postgres autogestionado y qué pasa a lógica de aplicación.

---

## 9. Cómo usar este documento en futuras conversaciones con la IA

- Pegar (o referenciar) este archivo al inicio de la conversación para que la IA:
  - Entienda la **arquitectura completa** sin tener que redescubrirla.
  - Sepa que el contexto es **frontend autohosteado + backend en Supabase/Lovable**.
  - Tenga claro dónde están:
    - Front (`src/**`).
    - Backend (`supabase/functions/**` + `supabase/migrations/**`).
    - Config sensible (`.env`, `supabase/config.toml`).
- A partir de aquí, puedes pedir:
  - Diseños de nuevas features.
  - Planes de migración técnica.
  - Análisis de riesgos.
  - Mejoras de UX o de IA.