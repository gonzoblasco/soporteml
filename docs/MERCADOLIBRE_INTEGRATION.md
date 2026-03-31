# MercadoLibre Integration — Technical Documentation

> **Audience:** Developers joining the SoporteML project.
> **Last updated:** 2026-03-31

---

## Table of Contents

1. [Arquitectura general](#1-arquitectura-general)
2. [Autenticación y credenciales](#2-autenticación-y-credenciales)
3. [Ingesta de consultas](#3-ingesta-de-consultas)
4. [Procesamiento de preguntas](#4-procesamiento-de-preguntas)
5. [Edge functions — detalle por función](#5-edge-functions--detalle-por-función)
6. [Variables de entorno necesarias](#6-variables-de-entorno-necesarias)
7. [Cómo probarlo localmente](#7-cómo-probarlo-localmente)

---

## 1. Arquitectura general

### 1.1 Componentes

```
┌──────────────┐        ┌──────────────────────────────┐
│   Frontend   │───────▶│ Supabase (Lovable Cloud)     │
│  React SPA   │        │                              │
│              │        │  ┌────────────────────────┐  │
│  Settings    │────────│──│ Edge Functions          │  │
│  Inbox       │        │  │  sync-meli-questions    │──│──▶ MercadoLibre API
│  Copilot     │        │  │  meli-oauth-callback    │  │    api.mercadolibre.com
│              │        │  │  publish-meli-answer    │  │
│              │        │  │  disconnect-meli        │  │
│              │        │  │  meli-item-proxy        │  │    ┌─────────────┐
│              │        │  │  enrich-product         │──│──▶ │ AI Gateway  │
│              │        │  │  detect-duplicates      │  │    │ Lovable/    │
│              │        │  │  backfill-ai-answers    │  │    │ OpenAI      │
│              │        │  │  debug-meli             │  │    └─────────────┘
│              │        │  └────────────────────────┘  │
│              │        │                              │
│              │        │  ┌────────────────────────┐  │
│              │────────│──│ PostgreSQL (RLS)       │  │
│              │        │  │  questions             │  │
│              │        │  │  products              │  │
│              │        │  │  meli_tokens           │  │
│              │        │  │  company_settings      │  │
│              │        │  │  knowledge_entries     │  │
│              │        │  │  events                │  │
│              │        │  └────────────────────────┘  │
└──────────────┘        └──────────────────────────────┘
```

### 1.2 Edge functions relacionadas con MeLi

| Función | Rol |
|---|---|
| `meli-oauth-callback` | Recibe el código de autorización de ML, intercambia por tokens, almacena en `meli_tokens`. |
| `sync-meli-questions` | Monolito de ingesta: obtiene preguntas sin responder de ML, enriquece con datos del producto, genera respuesta IA, decide si auto-publicar, y almacena todo en `questions`. |
| `publish-meli-answer` | Publica una respuesta manual en ML vía `POST /answers`. |
| `disconnect-meli` | Elimina los tokens de ML de una empresa (admin only). |
| `meli-item-proxy` | Proxy autenticado para obtener datos de un ítem + descripción de ML. |
| `enrich-product` | Obtiene datos frescos de ML, cachea, y genera sugerencias CRM con IA (resumen, FAQ, garantía, etc.). |
| `detect-duplicates` | Detecta productos duplicados en 4 niveles: external_id, meli_item_id, SKU, similitud de título (pg_trgm). |
| `backfill-ai-answers` | Re-genera respuestas IA para preguntas pendientes/needs_human (super admin only). |
| `debug-meli` | Diagnóstico: muestra estado del token, grants de la app ML (super admin only). |

### 1.3 Flujo end-to-end de una pregunta

```
1. Comprador pregunta en MercadoLibre
2. pg_cron dispara sync-meli-questions cada 5 min (o usuario fuerza sync manual)
3. sync-meli-questions:
   a. Obtiene access_token (refresh si está por expirar)
   b. GET /my/received_questions/search?status=UNANSWERED
   c. Para cada pregunta nueva:
      - Fetch datos del ítem (triple fallback: auth → público → multiget)
      - Busca/crea el producto en la tabla `products`
      - Fetch CRM knowledge (support_summary, key_points, etc.)
      - Fetch knowledge_entries (base de conocimiento del negocio)
      - Fetch descripción del ítem de ML
      - Genera respuesta IA (gemini-3-flash-preview, temp 0.4)
      - Motor de decisión: auto-publicar vs sugerir vs needs_human
      - Si auto_reply → POST /answers directo en ML
      - INSERT en tabla `questions` con todos los metadatos
      - Si needs_human → notifica vía función `notify`
4. Agente ve la pregunta en Inbox/Priority, edita y publica vía publish-meli-answer
5. publish-meli-answer: POST /answers en ML, actualiza status a "published"
```

### 1.4 Servicios externos

| Servicio | Uso | URL base |
|---|---|---|
| MercadoLibre API | OAuth, preguntas, ítems, respuestas, usuarios, categorías | `https://api.mercadolibre.com` |
| MercadoLibre Auth | Autorización OAuth | `https://auth.mercadolibre.com.ar` |
| Lovable AI Gateway | Generación de respuestas IA | `https://ai.gateway.lovable.dev/v1/chat/completions` |
| Supabase | Base de datos, auth, edge functions, realtime | `https://ropbkdqhqdeiwrenrmjt.supabase.co` |

---

## 2. Autenticación y credenciales

### 2.1 Flujo OAuth con PKCE

El frontend implementa el flujo OAuth 2.0 con PKCE obligatorio:

```
Frontend                          MercadoLibre                    meli-oauth-callback
   │                                    │                                │
   │ 1. Genera code_verifier (32 bytes random, base64url)                │
   │ 2. Genera code_challenge = SHA-256(verifier)                        │
   │ 3. state = "company_id|code_verifier"                               │
   │                                    │                                │
   │──── GET /authorization ───────────▶│                                │
   │     ?response_type=code            │                                │
   │     &client_id=MELI_APP_ID         │                                │
   │     &redirect_uri=.../meli-oauth-callback                           │
   │     &state=...                     │                                │
   │     &scope=offline_access read write                                │
   │     &code_challenge=...            │                                │
   │     &code_challenge_method=S256    │                                │
   │                                    │                                │
   │     [Usuario autoriza en popup]    │                                │
   │                                    │                                │
   │                                    │──── GET ?code=...&state=... ──▶│
   │                                    │                                │
   │                                    │    4. Parsea state: company_id + verifier
   │                                    │    5. POST /oauth/token         │
   │                                    │       grant_type=authorization_code
   │                                    │       code_verifier=...         │
   │                                    │       client_id, client_secret  │
   │                                    │                                │
   │                                    │◀── access_token, refresh_token │
   │                                    │                                │
   │                                    │    6. Upsert meli_tokens       │
   │                                    │    7. Responde HTML "Conectado" │
   │                                    │                                │
   │◀── [Popup se cierra, front recarga estado]                          │
```

**Scopes requeridos:** `offline_access read write`

- `offline_access`: necesario para obtener `refresh_token`
- `read`: leer preguntas, ítems, usuarios
- `write`: publicar respuestas

### 2.2 Almacenamiento de tokens

Tabla `meli_tokens` (constraint UNIQUE en `company_id` → 1 conexión ML por empresa):

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid (PK) | Auto-generado |
| `company_id` | uuid (UNIQUE, FK → companies) | Empresa dueña |
| `access_token` | text | Token de acceso actual |
| `refresh_token` | text (nullable) | Token de renovación |
| `expires_at` | timestamptz | Expiración del access_token |
| `meli_user_id` | text | ID del usuario ML |
| `created_at` | timestamptz | Primera conexión |
| `updated_at` | timestamptz | Última renovación |

**RLS:** Solo super admins pueden leer tokens. Solo admins de la empresa pueden eliminar (disconnect). No hay SELECT público → los tokens raw nunca llegan al frontend.

### 2.3 Renovación automática de tokens

Implementada en `_shared/refreshMeliToken.ts`:

1. Si faltan >5 minutos para expirar → usa el `access_token` actual.
2. Si faltan ≤5 minutos o ya expiró:
   - `POST /oauth/token` con `grant_type=refresh_token`.
   - Actualiza `meli_tokens` con **optimistic locking** (`WHERE refresh_token = current_value`).
   - Si hay conflicto (otro proceso ya renovó), re-lee de la DB y usa el token fresco.
   - Si MeLi devuelve un nuevo `refresh_token`, lo persiste (rotación).
3. Si no hay `refresh_token` → lanza error, el usuario debe reconectar manualmente.

### 2.4 Vista segura para el frontend

La vista `meli_connection_status` expone datos no-sensibles:

```sql
-- Campos visibles: company_id, meli_user_id, expires_at, updated_at, has_refresh_token
-- Campos EXCLUIDOS: access_token, refresh_token
```

El componente `MeliConnectionSection.tsx` lee de esta vista para mostrar estado de salud.

---

## 3. Ingesta de consultas

### 3.1 Mecanismo: Polling (no webhook)

SoporteML **no usa webhooks de ML**. Usa **polling** activo:

- **Trigger automático:** Un job `pg_cron` llamado `sync-meli-questions-every-5min` invoca la función cada 5 minutos con `source: "cron"` y `Authorization: Bearer <SERVICE_ROLE_KEY>`.
- **Trigger manual:** El usuario presiona "Forzar sincronización" en Settings, que invoca la misma función con su JWT de usuario.

### 3.2 Control de frecuencia por empresa

Cada empresa tiene `company_settings.sync_interval_minutes` (5, 15 o 30 min). El cron dispara cada 5 min, pero la función evalúa para cada empresa si ha pasado suficiente tiempo desde `last_synced_at` antes de sincronizar.

### 3.3 Endpoint de ingesta

```
POST /functions/v1/sync-meli-questions
```

**Autenticación dual:**
- **Cron (service role):** `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` + body `{ source: "cron" }`.
- **Usuario (JWT):** Bearer token del usuario autenticado. Se valida membresía a la empresa.

### 3.4 API de MercadoLibre consultada

```
GET https://api.mercadolibre.com/my/received_questions/search
  ?status=UNANSWERED
  &seller_id={meli_user_id}
  &sort_fields=date_created
  &sort_types=DESC
  &limit=50
```

### 3.5 Formato del payload de MercadoLibre

Cada pregunta del array `questions` tiene esta estructura:

```json
{
  "id": 123456789,
  "text": "¿Tiene envío gratis a Córdoba?",
  "status": "UNANSWERED",
  "date_created": "2026-03-30T14:22:00.000-04:00",
  "item_id": "MLA1234567890",
  "from": {
    "id": 987654321,
    "nickname": "COMPRADORTEST"
  }
}
```

Campos utilizados por la función:
- `id` → se convierte a string y se almacena como `meli_question_id`.
- `text` → `question_text`.
- `item_id` → se usa para buscar/crear el producto en `products`.
- `from.id` → `buyer_id`, y se hace un fetch adicional a `/users/{id}` para obtener `nickname`.
- `date_created` → `created_at` de la pregunta.
- `status` → `meli_status`.

### 3.6 Preguntas ya procesadas / descartadas

- Si `meli_question_id` ya existe en `questions` → se ignora (salvo reparación de `product_id` nulo).
- Si existe en `dismissed_meli_questions` → se ignora permanentemente.

---

## 4. Procesamiento de preguntas

### 4.1 Pipeline de procesamiento (por cada pregunta nueva)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CHECK: ¿Descartada? → Skip                                  │
│ 2. CHECK: ¿Ya existe? → Skip (o reparar product_id si null)    │
│ 3. FETCH PRODUCT: fetchItemFromMeli (triple fallback)           │
│    ├─ Auth: GET /items/{id} con Bearer token                    │
│    ├─ Public: GET /items/{id} sin auth                          │
│    └─ Multiget: GET /items?ids={id} con Bearer                  │
│ 4. STORE PRODUCT: Insert/update en tabla `products`             │
│    └─ Prohíbe títulos placeholder (≠ item_id)                   │
│ 5. FETCH CRM: support_summary, key_points, shipping, warranty   │
│ 6. FETCH KNOWLEDGE: knowledge_entries (global + categoría)      │
│ 7. FETCH DESCRIPTION: GET /items/{id}/description (o cache)     │
│ 8. FETCH BUYER: GET /users/{buyer_id} → nickname                │
│ 9. GENERATE AI: gemini-3-flash-preview, temp 0.4               │
│    Output: { answer, category, requires_human, confidence }     │
│ 10. DECISION ENGINE: auto_reply vs suggest vs needs_human       │
│ 11. AUTO-PUBLISH (si aplica): POST /answers en ML               │
│ 12. INSERT: Guardar en tabla `questions`                        │
│ 13. NOTIFY: Si needs_human → invocar función `notify`           │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Generación de respuesta IA

**Servicio:** `_shared/ai-service.ts` → función `generateAiAnswer()`

**Modelo:** `google/gemini-3-flash-preview` (configurable vía `AI_MODEL`)  
**Temperatura:** 0.4  
**Límite de respuesta:** 350 caracteres (impuesto por ML)

**System prompt incluye:**
- Tono configurado por empresa (`ai_tone`).
- Instrucciones custom del vendedor (`ai_custom_instructions`).
- Reglas de exclusión (`auto_reply_exclusion_rules`).
- Conocimiento CRM del producto (`crmKnowledge`).
- Base de conocimiento del negocio (`businessKnowledge`).
- Restricciones de negocio.

**Output esperado (JSON):**
```json
{
  "answer": "Hola! Sí, tiene envío gratis a todo el país. Saludos!",
  "category": "Envío",
  "requires_human": false,
  "requires_human_reason": "",
  "confidence": 0.92
}
```

**Categorías posibles:** `Precio`, `Stock`, `Técnico`, `Envío`, `Garantía`, `Otro`.

### 4.3 Motor de decisión (Autopilot)

La decisión de qué hacer con la respuesta IA sigue esta cascada:

| Prioridad | Condición | Resultado | Status |
|---|---|---|---|
| 1 | `requires_human = true` | Derivar a humano | `needs_human` |
| 2 | Autopilot fuera de horario + confidence ≥ threshold + fuera de horario | Auto-publicar | `queued_auto` → `auto_published` |
| 3 | Autopilot en horario + confidence ≥ threshold + en horario | Auto-publicar | `queued_auto` → `auto_published` |
| 4 | Legacy `auto_reply_mode = "always"` | Auto-publicar | `queued_auto` → `auto_published` |
| 5 | Legacy `auto_reply_mode = "outside_business_hours"` + fuera de horario | Auto-publicar | `queued_auto` → `auto_published` |
| 6 | Default | Sugerir al agente | `pending` |

**Umbral de confianza:** `autopilot_confidence_threshold` (default: 0.85)

**Horario laboral:** Calculado en horario de Argentina (UTC-3) usando `_shared/business-hours.ts`.

### 4.4 Auto-publicación

Si el motor decide auto-publicar, se usa `_shared/meli-service.ts` → `autoPublishMeliAnswer()`:

```
POST https://api.mercadolibre.com/answers
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "question_id": 123456789,  // number, no string
  "text": "Hola! Sí, tiene envío gratis..."
}
```

Si la publicación falla, la pregunta se marca como `needs_human` con razón `"Auto-publicación falló, requiere revisión manual"`.

### 4.5 Tablas involucradas

| Tabla | Lectura | Escritura | Propósito |
|---|---|---|---|
| `meli_tokens` | ✅ | ✅ | Tokens OAuth (refresh si necesario) |
| `company_settings` | ✅ | ✅ | Config de autopilot, tono IA, intervalo sync |
| `questions` | ✅ | ✅ | Preguntas procesadas |
| `products` | ✅ | ✅ | Catálogo de productos (crear/reparar) |
| `product_variants` | ✅ | ❌ | Variantes para contexto CRM |
| `knowledge_entries` | ✅ | ❌ | Base de conocimiento del negocio |
| `dismissed_meli_questions` | ✅ | ❌ | Blacklist de preguntas |
| `events` | ❌ | ✅ | Log de eventos (SYNC_STARTED, AI_DECISION, etc.) |
| `notifications` | ❌ | ✅ (vía `notify`) | Notificaciones push para needs_human |

### 4.6 Schema de la tabla `questions`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | uuid (PK) | Auto-generado |
| `company_id` | uuid (FK) | Empresa dueña |
| `meli_question_id` | text | ID original de ML (string) |
| `product_id` | uuid (FK, nullable) | Producto vinculado |
| `product_meli_id` | text (nullable) | `item_id` de ML |
| `question_text` | text | Texto de la pregunta |
| `buyer_id` | text (nullable) | ID del comprador en ML |
| `buyer_nickname` | text (nullable) | Nickname del comprador |
| `status` | text | `pending`, `published`, `auto_published`, `needs_human`, `queued_auto`, `archived`, `error`, `deleted` |
| `ai_suggested_answer` | text (nullable) | Respuesta sugerida por IA |
| `ai_category` | text (nullable) | Categoría inferida por IA |
| `ai_confidence` | numeric (nullable) | Confianza de la IA (0-1) |
| `ai_decision_reason` | text (nullable) | Razón de la decisión del motor |
| `auto_action` | text (nullable) | `none`, `suggest`, `auto_reply` |
| `answered_by_ai` | boolean | Si fue respondida automáticamente |
| `final_answer` | text (nullable) | Respuesta publicada en ML |
| `answered_by` | uuid (FK, nullable) | Usuario que publicó manualmente |
| `answered_at` | timestamptz (nullable) | Cuándo se publicó |
| `requires_human` | boolean | Si necesita revisión humana |
| `requires_human_reason` | text (nullable) | Razón por la que necesita humano |
| `meli_status` | text (nullable) | Status original de ML |
| `meli_permalink` | text (nullable) | Link a la publicación |
| `created_at` | timestamptz | Fecha de creación de la pregunta en ML |

---

## 5. Edge functions — detalle por función

### 5.1 `meli-oauth-callback`

| Campo | Valor |
|---|---|
| **Trigger** | Redirect de MercadoLibre tras autorización OAuth |
| **verify_jwt** | `false` (es un redirect del browser, no tiene JWT) |
| **Input** | Query params: `code`, `state` (formato: `company_id\|code_verifier`) |
| **Output** | HTML con mensaje de éxito/error |
| **Dependencias** | `MELI_APP_ID`, `MELI_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Tabla(s)** | `meli_tokens` (select + insert/update) |

**Validaciones:**
- `state` ≤ 200 caracteres, formato `UUID|base64url` (máx 2 segmentos).
- UUID validation para `company_id`.
- `code_verifier`: 43-128 chars, charset `[A-Za-z0-9_-]`.

**Lógica de upsert:** Si ya existe un registro para la empresa, hace `UPDATE` sin pisar `refresh_token` si ML no devolvió uno nuevo. Si es la primera conexión, hace `INSERT`.

**Errores:**
- `400` — Missing/invalid code, state, company_id, o code_verifier.
- `500` — Token exchange falló, error de DB.

---

### 5.2 `sync-meli-questions`

| Campo | Valor |
|---|---|
| **Trigger** | `pg_cron` (cada 5 min) o botón manual del usuario |
| **verify_jwt** | `false` (validación interna) |
| **Input** | Body JSON: `{ company_id?, source?: "cron", resource?, meli_user_id? }` |
| **Output** | `{ synced: number, message: string }` |
| **Dependencias** | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `MELI_APP_ID`, `MELI_SECRET_KEY`, `AI_API_KEY` o `LOVABLE_API_KEY` |

**Modos de autenticación:**
- **Service role + `source: "cron"`**: procesa todas las empresas con tokens.
- **User JWT**: procesa solo la empresa del usuario (validada vía `user_belongs_to_company`).

**Limitaciones:**
- Máximo 50 preguntas por sync (parámetro `limit` de la API ML).
- No procesa preguntas ya respondidas en ML (`status=UNANSWERED`).

**Decisión de diseño:** Es un monolito de ~813 líneas. Identificado como deuda técnica principal. Centraliza: fetch ML, enriquecimiento de producto, generación IA, auto-publicación, y notificaciones.

**Errores:**
- `401` — Token inválido.
- `403` — Usuario no pertenece a la empresa.
- `500` — Error genérico.

---

### 5.3 `publish-meli-answer`

| Campo | Valor |
|---|---|
| **Trigger** | Usuario publica respuesta desde el Inbox |
| **verify_jwt** | `true` |
| **Input** | `{ question_id: uuid, answer: string }` |
| **Output** | `{ ok: true, message: "Answer published..." }` |
| **Dependencias** | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `MELI_APP_ID`, `MELI_SECRET_KEY` |
| **Tabla(s)** | `questions` (select + update), `meli_tokens` (select + posible refresh) |

**Flujo:**
1. Valida JWT del usuario.
2. Busca la pregunta en DB.
3. Verifica que el usuario pertenece a la empresa de la pregunta.
4. Obtiene y refresca el token ML de la empresa.
5. `POST /answers` a ML con `question_id` (number) y `text`.
6. Actualiza `questions`: `status=published`, `answered_by`, `answered_at`, `final_answer`.

**Errores:**
- `400` — Falta `question_id` o `answer`, o no hay token ML.
- `403` — Usuario no pertenece a la empresa.
- `404` — Pregunta no encontrada.
- `502` — Error de ML al publicar (la pregunta se marca como `error`).

---

### 5.4 `disconnect-meli`

| Campo | Valor |
|---|---|
| **Trigger** | Botón "Desconectar" en Settings |
| **verify_jwt** | `false` (validación interna) |
| **Input** | `{ company_id?: uuid }` |
| **Output** | `{ success: true }` |
| **Dependencias** | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Tabla(s)** | `meli_tokens` (delete) |

**Autorización:** Requiere rol `admin` en la empresa (vía `has_membership_role`).

**Errores:**
- `401` — JWT inválido.
- `403` — No es admin de la empresa.
- `500` — Error de DB.

---

### 5.5 `meli-item-proxy`

| Campo | Valor |
|---|---|
| **Trigger** | Frontend necesita datos de un ítem ML (ej. Catálogo, Copilot) |
| **verify_jwt** | `false` (validación interna) |
| **Input** | `{ item_id: string }` |
| **Output** | `{ item: MeliItemObject, description: string \| null }` |
| **Dependencias** | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` |
| **Tabla(s)** | `meli_tokens` (select, read-only) |

**Flujo:**
1. Valida JWT del usuario.
2. Obtiene token ML de la empresa del usuario.
3. Fetch paralelo: `GET /items/{id}` + `GET /items/{id}/description`.
4. Si no hay token, intenta fetch público (sin auth).

**Decisión de diseño:** No refresca el token (usa el actual tal cual). Si expiró, el fetch público puede funcionar para ítems no privados.

---

### 5.6 `enrich-product`

| Campo | Valor |
|---|---|
| **Trigger** | Botón "Enriquecer" en el catálogo |
| **verify_jwt** | `true` |
| **Input** | `{ product_id: uuid, force_refresh?: boolean }` |
| **Output** | `{ enriched: true, auto_filled: string[], ai_suggestions: object, ... }` |
| **Dependencias** | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `MELI_APP_ID`, `MELI_SECRET_KEY`, `AI_API_KEY`/`LOVABLE_API_KEY` |
| **Tabla(s)** | `products` (select + update), `meli_tokens` (select + posible refresh) |

**Cache:** TTL de 24 horas en `products.meli_cache`. Si `force_refresh=true` o cache expirado, re-fetcha de ML.

**"Regla de Oro":** Auto-completa campos vacíos con sugerencias IA. Si el campo ya tiene contenido humano, genera sugerencias pero NO sobreescribe (el frontend muestra botones "Apply"/"Dismiss").

**IA:** Usa tool calling (function `enrich_product_fields`) con gemini-3-flash-preview para generar: `support_summary`, `key_points`, `faq_bullets`, `warranty_notes`, `shipping_notes`.

---

### 5.7 `detect-duplicates`

| Campo | Valor |
|---|---|
| **Trigger** | Componente `DuplicateDetector` en el catálogo |
| **verify_jwt** | `true` |
| **Input** | `{ product_id: uuid }` |
| **Output** | `{ product_id, duplicates: DuplicateCandidate[], count: number }` |
| **Tabla(s)** | `products` (select) |

**4 niveles de detección:**
1. `external_id` exacto (mismo source).
2. `meli_item_id` exacto.
3. `SKU` exacto.
4. Similitud de título > 0.6 (via `pg_trgm` y función SQL `find_similar_products`).

---

### 5.8 `backfill-ai-answers`

| Campo | Valor |
|---|---|
| **Trigger** | Admin panel (super admin only) |
| **verify_jwt** | `false` (validación interna: `is_super_admin()`) |
| **Input** | Ninguno |
| **Output** | `{ backfilled: number, errors: number, total: number }` |
| **Tabla(s)** | `questions`, `products`, `product_variants`, `company_settings` |

**Comportamiento:** Busca hasta 100 preguntas con status `pending` o `needs_human` que tengan `product_id`, y re-genera `ai_suggested_answer` usando `generateCopilotDraft`. Rate limit: 500ms entre requests.

---

### 5.9 `debug-meli`

| Campo | Valor |
|---|---|
| **Trigger** | Manual (super admin only) |
| **verify_jwt** | `false` (validación interna: `is_super_admin()`) |
| **Input** | Ninguno |
| **Output** | `{ token_info: {...}, grants_status: number, grants_body: {...} }` |

**Nota:** El endpoint `GET /applications/{id}/grants` requiere el token del **owner** de la app ML. Tokens de otros usuarios darán 403 (`caller_not_user`).

---

## 6. Variables de entorno necesarias

| Variable | Dónde se usa | Requerida | Descripción |
|---|---|---|---|
| `MELI_APP_ID` | Edge Functions + Frontend | ✅ | App ID de la aplicación registrada en ML |
| `MELI_SECRET_KEY` | Edge Functions | ✅ | Secret key de la app ML (nunca en frontend) |
| `VITE_MELI_APP_ID` | Frontend | ✅ | Mismo valor que `MELI_APP_ID`, pero accesible en el bundle del frontend |
| `SUPABASE_URL` | Edge Functions (auto) | ✅ | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge Functions (auto) | ✅ | Service role key (acceso total, bypass RLS) |
| `SUPABASE_ANON_KEY` | Edge Functions (auto) | ✅ | Anon key (para validar JWTs de usuarios) |
| `AI_API_KEY` | Edge Functions | ⚠️ | API key para el gateway de IA. Fallback: `LOVABLE_API_KEY` |
| `LOVABLE_API_KEY` | Edge Functions (auto) | ⚠️ | API key automática de Lovable para IA |
| `AI_API_URL` | Edge Functions | ❌ | URL custom del gateway IA. Default: `https://ai.gateway.lovable.dev/v1/chat/completions` |
| `AI_MODEL` | Edge Functions | ❌ | Modelo IA. Default: `google/gemini-3-flash-preview` |

> ⚠️ = Al menos uno de `AI_API_KEY` o `LOVABLE_API_KEY` debe estar configurado para que funcione la IA.

---

## 7. Cómo probarlo localmente

### 7.1 Prerrequisitos

- Node.js 18+
- Supabase CLI
- Cuenta de MercadoLibre (sandbox o producción)
- App registrada en [MercadoLibre Developers](https://developers.mercadolibre.com.ar/devcenter)

### 7.2 Setup

```bash
# 1. Clonar el repositorio
git clone <repo-url> && cd soporteml

# 2. Instalar dependencias del frontend
npm install

# 3. Configurar variables de entorno del frontend
cp .env.example .env
# Editar .env con las URLs y keys correctas

# 4. Levantar el frontend
npm run dev
```

### 7.3 Levantar edge functions localmente

```bash
# 1. Login en Supabase
supabase login

# 2. Link al proyecto
supabase link --project-ref ropbkdqhqdeiwrenrmjt

# 3. Configurar secrets locales
supabase secrets set MELI_APP_ID=<tu_app_id>
supabase secrets set MELI_SECRET_KEY=<tu_secret_key>

# 4. Levantar funciones
supabase functions serve --no-verify-jwt
```

### 7.4 Simular una sincronización

```bash
# Simular un sync manual (requiere un JWT válido)
curl -X POST http://localhost:54321/functions/v1/sync-meli-questions \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"company_id": "<uuid>"}'
```

### 7.5 Simular una pregunta individual

```bash
# Si tenés el resource path de una pregunta ML:
curl -X POST http://localhost:54321/functions/v1/sync-meli-questions \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"resource": "/questions/123456789", "company_id": "<uuid>"}'
```

### 7.6 Flujo de conexión OAuth en desarrollo

1. En tu app ML, configurar el redirect URI como:
   `http://localhost:54321/functions/v1/meli-oauth-callback`
   (o la URL de tu proyecto Supabase si usás funciones remotas)
2. En el frontend, `VITE_SUPABASE_URL` debe apuntar al mismo host.
3. Hacer click en "Conectar MercadoLibre" → se abre popup → autorizar → tokens almacenados.

### 7.7 Verificar estado de conexión

```bash
# Consultar la vista segura
curl http://localhost:54321/rest/v1/meli_connection_status \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

---

## Apéndice A: Shared modules

| Módulo | Archivo | Exportaciones | Usado por |
|---|---|---|---|
| Token refresh | `_shared/refreshMeliToken.ts` | `refreshTokenIfNeeded()`, `TokenRow` | sync, publish, enrich |
| AI service | `_shared/ai-service.ts` | `generateAiAnswer()`, `generateCopilotDraft()` | sync, backfill, ai-copilot |
| MeLi service | `_shared/meli-service.ts` | `autoPublishMeliAnswer()` | sync |
| Knowledge | `_shared/knowledge-service.ts` | `fetchKnowledgeContext()` | sync, ai-copilot |
| Business hours | `_shared/business-hours.ts` | `isOutsideBusinessHours()` | sync |
| Utils | `_shared/utils.ts` | `corsHeaders`, `logEvent()` | Todos |

## Apéndice B: Eventos registrados en tabla `events`

| Tipo | Entity Type | Descripción |
|---|---|---|
| `SYNC_STARTED` | token | Inicio de sincronización para una empresa |
| `SYNC_DONE` | sync | Sync completado con cantidad de preguntas |
| `AI_DECISION` | question | Decisión del motor (confidence, action, reason) |
| `AUTO_REPLY_SENT` | question | Respuesta auto-publicada exitosamente |
| `ERROR` | sync/question | Error durante procesamiento |

## Apéndice C: Frontend components

| Componente | Archivo | Función |
|---|---|---|
| `MeliConnectionSection` | `src/components/settings/MeliConnectionSection.tsx` | UI de conexión/desconexión ML, sync manual, intervalo |
| `MeliConnectionStatus` | `src/components/MeliConnectionStatus.tsx` | Badge de estado de conexión |
| `QuestionDetail` | `src/components/QuestionDetail.tsx` | Detalle de pregunta con botón "Publicar respuesta" |
| `AICopilotPanel` | `src/components/AICopilotPanel.tsx` | Panel de copiloto IA |
| `EnrichButton` | `src/components/catalog/EnrichButton.tsx` | Botón de enriquecimiento de producto |
| `DuplicateDetector` | `src/components/catalog/DuplicateDetector.tsx` | Detector de duplicados |
