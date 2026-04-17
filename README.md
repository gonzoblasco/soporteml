# SoporteML

Plataforma multi-tenant para gestionar preguntas de Mercado Libre con IA.
Construida en Lovable (React + Vite + TypeScript + Tailwind + shadcn/ui + Supabase).

> Estado actual: EL-1 a EL-5 completos. Billing con Mercado Pago, Knowledge Base con pgvector, RAG en copiloto, Analytics dedicado, Settings consolidado, hardening de seguridad aplicado.

---

## Qué resuelve

Vendedores y equipos en Mercado Libre tienen el soporte fragmentado: preguntas dispersas, respuestas inconsistentes, tiempos lentos, poca trazabilidad y dificultad para operar varias empresas. SoporteML unifica ese flujo en una sola aplicación.

---

## Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Edge Functions + RLS + pgvector)
- **IA**: Edge Function `ai-copilot` + OpenAI `text-embedding-3-small` (embeddings KB)
- **Billing**: Mercado Pago Preapproval (suscripciones recurrentes)
- **Integración**: Mercado Libre API (OAuth PKCE + webhook + items proxy)
- **Auth**: Email/password + Google OAuth (Lovable managed)

---

## Epics completados

| Epic | Feature                                                    | Estado |
| ---- | ---------------------------------------------------------- | ------ |
| EL-1 | Billing migrado de Stripe → Mercado Pago Preapproval       | ✅     |
| EL-2 | Knowledge Base con pgvector + embeddings OpenAI            | ✅     |
| EL-3 | RAG real en ai-copilot (búsqueda semántica + source chips) | ✅     |
| EL-4 | Analytics dedicado (`/analytics`) + Dashboard simplificado | ✅     |
| EL-5 | Settings consolidado (layout 2 paneles + Danger zone)      | ✅     |
| —    | Hardening de seguridad (EFs auditadas, membership checks)  | ✅     |
| —    | Google sign-in + flujo `/post-google` para usuarios nuevos | ✅     |

---

## Capacidades principales

### Inbox

- Bandeja centralizada con tabs: Pendientes, Publicadas, Auto IA, Archivadas
- Agrupación automática por comprador + producto
- Bandeja Prioritaria separada para consultas que requieren atención humana
- Búsqueda en tiempo real, navegación por teclado

### Copiloto IA

- Genera borradores con contexto del producto (MeLi) + Knowledge Base de la empresa
- RAG real: busca chunks relevantes en KB antes de responder
- Source attribution: chips de artículos KB usados en cada respuesta
- Tonos configurables (breve, cálida, técnica)
- Autopilot: respuesta automática con umbral de confianza configurable

### Knowledge Base

- Artículos con chunking automático (~500 tokens, overlap 50)
- Embeddings con `text-embedding-3-small` de OpenAI
- Búsqueda semántica con pgvector (índice ivfflat coseno)
- Realtime sobre estado de procesamiento
- RLS estricto por empresa

### Analytics

- Ruta dedicada `/analytics` con selector 7/30/90 días
- KPIs: total, auto-resueltas, escaladas, pendientes, confianza promedio, tasa de auto-resolución
- Deltas vs período anterior
- Volumen diario (barras apiladas), distribución por categoría (donut), top productos/compradores
- Export CSV

### Integración Mercado Libre

- OAuth PKCE completo
- Webhook operativo
- Sincronización automática de preguntas
- Proxy de items con refresh automático de tokens
- Estado de conexión visible con 4 niveles de salud

### Multi-company

- Un usuario puede pertenecer a múltiples empresas
- Cambio de empresa activa desde UI
- Aislamiento estricto por `company_id` via RLS

### Billing

- Mercado Pago Preapproval (suscripciones recurrentes en ARS)
- Webhook IPN con validación HMAC SHA-256
- Estados: free / active / paused / cancelled / pending

### Settings

- Layout 2 paneles con nav lateral interna
- Secciones: Autopilot, Prompt y tono, Modelo (RAG config), Equipo, Plan, MercadoLibre, Danger zone
- Sliders para `kb_top_k` y `kb_similarity_threshold`
- Soft delete de empresa con confirmación

---

## Edge Functions

| Función                  | Propósito                                      |
| ------------------------ | ---------------------------------------------- |
| `meli-oauth-callback`    | Callback OAuth PKCE de MeLi                    |
| `sync-meli-questions`    | Sincronización + autopilot + categorización IA |
| `meli-webhook`           | Eventos IPN de MeLi                            |
| `meli-item-proxy`        | Proxy de items con refresh de token            |
| `disconnect-meli`        | Desconexión de cuenta MeLi                     |
| `ai-copilot`             | Copiloto con RAG (KB + contexto CRM)           |
| `publish-meli-answer`    | Publicación de respuestas en MeLi              |
| `kb-process-article`     | Chunking + embeddings de artículos KB          |
| `kb-search`              | Búsqueda semántica en KB                       |
| `kb-delete-article`      | Eliminación de artículos KB (admin)            |
| `mp-create-subscription` | Crear preapproval en MP                        |
| `mp-check-subscription`  | Verificar estado de suscripción                |
| `mp-cancel-subscription` | Pausar preapproval en MP                       |
| `mp-webhook`             | IPN de Mercado Pago                            |
| `audit-log`              | Registro de auditoría de entidades             |
| `notify`                 | Notificaciones in-app (service-role only)      |
| `admin-create-user`      | Creación de usuarios (super admin)             |
| `enrich-product`         | Enriquecimiento de productos con MeLi + IA     |
| `detect-duplicates`      | Detección de productos duplicados              |

---

## Tablas principales

`companies`, `memberships`, `profiles`, `super_admins`, `company_invites`, `questions`, `products`, `product_variants`, `company_settings`, `kb_articles`, `kb_chunks`, `meli_tokens`, `notifications`, `events`, `audit_logs`, `mp_webhook_events`, `templates`, `knowledge_entries`

---

## Modelo de seguridad

- RLS en todas las tablas por `company_id`
- `super_admins` como fuente de verdad server-side
- JWT validado manualmente en todas las EFs (`verify_jwt = false` + `getUser()`)
- `company_id` siempre derivado de DB, nunca del body del cliente
- `user_belongs_to_company` como check estándar de membership
- `meli_tokens` nunca expuesto al frontend (RPC `get_meli_connection_status`)
- Invite codes en tabla dedicada `company_invites` (RLS admin-only)
- HIBP leaked password protection activado

---

## Flujo principal

1. Admin conecta cuenta de Mercado Libre (OAuth PKCE)
2. MeLi envía eventos al webhook → sync automático de preguntas
3. Inbox muestra consultas con categorización IA
4. Copiloto genera borrador usando contexto CRM + KB de la empresa
5. Equipo revisa, ajusta y publica respuesta en MeLi

---

## Secrets requeridos (Supabase)

- `OPENAI_API_KEY` — embeddings KB
- `MP_ACCESS_TOKEN` — Mercado Pago
- `MP_WEBHOOK_SECRET` — validación HMAC webhook MP
- `MP_PREAPPROVAL_PLAN_ID` — ID del plan en MP
- `MELI_CLIENT_SECRET` — OAuth MeLi

---

## Rama activa

- `el-upgrade` — rama de desarrollo activa con todos los epics EL-x
- `main` — rama estable anterior (sin epics EL)
