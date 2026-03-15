# Conocimientos Aprendidos sobre SoporteML

## Resumen Ejecutivo
SoporteML es una plataforma SaaS para vendedores y equipos de Mercado Libre, enfocada en gestión de preguntas con IA. El proyecto usa React/Vite en el frontend y Supabase (Lovable Cloud) en el backend serverless. Actualmente en transición: frontend autohosteado, backend en Lovable. Público objetivo: vendedores alto volumen, equipos de soporte y agencias.

## Arquitectura General
- **Frontend (autohosteado)**: React + TypeScript + Vite + Tailwind + shadcn/ui + TanStack Query. Maneja UI, autenticación (Supabase Auth) y llamadas a backend.
- **Backend (Lovable/Supabase)**: PostgreSQL multi-tenant con RLS, Edge Functions (Deno), Realtime. Integra IA (Lovable AI), emails (Lovable Email), Stripe y Mercado Libre API.
- **Flujos principales**: Login/signup → consultas DB → llamadas a funciones serverless (ej. ai-copilot, meli-oauth) → respuestas contextuales con IA.

## Estructura de Carpetas
- **Frontend (`src/`)**:
  - `main.tsx`: Entry point, registra Service Worker.
  - `App.tsx`: Rutas, layout, providers (Auth, QueryClient, Theme).
  - `pages/`: Vistas (Inbox, Home, Settings, etc.).
  - `components/`: UI reutilizable (AICopilotPanel, QuestionCard, etc.).
  - `contexts/AuthContext.tsx`: Gestión de sesión, memberships, roles.
  - `integrations/supabase/client.ts`: Cliente Supabase con env vars.
  - `lib/`: Helpers (auditLog, groupQuestions).
- **Backend (`supabase/`)**:
  - `functions/`: Edge Functions (ai-copilot, auth-email-hook, meli-oauth-callback, etc.).
  - `config.toml`: Configuración de funciones (verify_jwt = false en la mayoría).

## Comunicación Frontend-Backend
- **URLs base**: `VITE_SUPABASE_URL` (frontend) apunta a Supabase en Lovable.
- **Endpoints**:
  - REST/Realtime: `VITE_SUPABASE_URL/rest/v1/...` (queries directas).
  - Funciones: `supabase.functions.invoke('nombre')` → `POST /functions/v1/nombre`.
- **Env vars frontend**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_MELI_APP_ID`.
- **Env vars backend**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`, `STRIPE_SECRET_KEY`, `MELI_APP_ID/SECRET`.
- **CORS**: Funciones devuelven `Access-Control-Allow-Origin: *`; Supabase puede requerir configuración adicional.
- **Auth**: Token Bearer en headers; validación manual en funciones.

## Dependencias Específicas de Lovable
- **IA**: `ai-copilot` llama a `https://ai.gateway.lovable.dev/v1/chat/completions` con `LOVABLE_API_KEY`.
- **Emails**: `auth-email-hook` usa `@lovable.dev/email-js` y `@lovable.dev/webhooks-js` para envío transactional.
- **Hosting**: Backend desplegado en Lovable/Supabase; frontend asume rutas `/functions/v1/...`.
- **Hardcodes**: `create-checkout` usa `origin || "https://soporteml.lovable.app"`; `auth-email-hook` tiene `SAMPLE_PROJECT_URL` con dominio Lovable.

## Riesgos en Transición (Frontend Fuera, Backend en Lovable)
- **CORS/Dominios**: Errores si origen frontend no está permitido en Supabase. Síntomas: bloqueos en requests.
- **Autenticación**: Cookies de Supabase requieren "Site URL" y "Redirect URLs" configurados. Síntomas: sesión no persiste.
- **Endpoints Hardcodeados**: Redirecciones a `soporteml.lovable.app` en lugar de dominio propio.
- **Paths de Funciones**: 404 si rutas cambian al migrar backend.

## Checklist de Validación (Frontend Autohosteado con Backend en Lovable)
1. Configurar env vars frontend y desplegar.
2. Probar login/logout; verificar requests a `/auth/v1/...`.
3. Generar respuesta IA (llama `ai-copilot`).
4. Probar billing (check-subscription, create-checkout).
5. Conectar MELI (OAuth callback).
6. Llamar health-check.
7. Verificar tokens y auth en logs backend.

## Recomendaciones para Mejora y Crecimiento
- **Técnicas**: Optimizar queries/caching; mejorar prompts IA; agregar modelos alternativos.
- **Funcionales**: Analytics avanzados, integraciones (Shopify, Slack), white-labeling para agencias.
- **Estrategia**: Expansión internacional, tiers premium, partnerships con MELI, marketing SEO/redes.
- **Migración Futura**: Centralizar llamadas en módulo API; abstraer proveedor IA; migrar funciones por etapas.

## Notas Adicionales
- Proyecto operativo en v1.3.1 con multi-empresa, autopilot, CRM, notificaciones.
- Transición actual: Mantener backend en Lovable mientras frontend se autohoste.
- Riesgos de vendor lock-in: Dependencia de Lovable AI/Email; planear reemplazos (OpenAI, SendGrid).
- Público: Vendedores >50 preguntas/día, equipos/agencias; foco en eficiencia y control humano sobre IA.