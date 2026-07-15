# Spec: Copiloto IA

## Purpose

Generar borradores de respuesta para preguntas de Mercado Libre usando contexto del producto (CRM) + Knowledge Base de la empresa (RAG con pgvector). Devuelve JSON estructurado con summary, draft, missing_data, sugerencias CRM y fuentes KB usadas. Soporta tono configurable, instrucciones custom del vendedor, y autopilot.

## Requirements

### Requirement: Generación de borradores con RAG
El copiloto SHALL generar borradores de respuesta usando contexto del producto (CRM) + Knowledge Base de la empresa (RAG con pgvector), devolviendo un JSON estructurado con `summary`, `draft`, `missing_data`, y opcionalmente `crm_suggestions` y `kb_sources`.

#### Scenario: Pregunta con KB relevante
- **WHEN** el usuario abre una pregunta y el copiloto se ejecuta
- **THEN** la Edge Function `ai-copilot` embebe la pregunta con `text-embedding-3-small` de OpenAI
- **AND** busca chunks relevantes en `kb_chunks` via RPC `match_kb_chunks` (umbral 0.45, top 5)
- **AND** incluye el contexto KB en el system prompt al LLM
- **AND** devuelve `kb_sources` (títulos únicos de artículos usados) y `kb_chunks_count`

#### Scenario: Pregunta sin KB o sin OPENAI_API_KEY
- **WHEN** no hay chunks relevantes o no hay API key configurada
- **THEN** el copiloto responde igual usando solo contexto CRM + info del producto
- **AND** `kb_sources` y `kb_chunks_count` se omiten del response

#### Scenario: Pregunta con producto en CRM
- **WHEN** la pregunta tiene `product_id` asociado y el producto tiene datos CRM
- **THEN** el system prompt incluye: `support_summary`, `key_points`, `shipping_notes`, `returns_notes`, `warranty_notes`, `faq_bullets`, `do_not_say`, y variantes
- **AND** el copiloto usa ese contexto para generar respuestas más precisas

### Requirement: Autenticación y aislamiento multi-tenant
La Edge Function `ai-copilot` SHALL validar JWT del usuario y derivar `company_id` server-side, nunca del cliente.

#### Scenario: Usuario autenticado
- **WHEN** llega una request con header `Authorization: Bearer <jwt>`
- **THEN** valida el usuario via `supabaseAuth.auth.getUser()`
- **AND** deriva `company_id` via RPC `get_user_company_id` con el `user.id`
- **AND** usa `serviceClient` con `SUPABASE_SERVICE_ROLE_KEY` para queries internas

#### Scenario: Usuario sin membership activa
- **WHEN** el usuario no tiene empresa activa
- **THEN** devuelve 403 "No active membership found"

### Requirement: Tono configurable
El copiloto SHALL respetar el tono configurado en `company_settings.ai_tone` y permitir override por request.

#### Scenario: Tono desde settings
- **WHEN** no se envía `ai_tone` en el body
- **THEN** usa `company_settings.ai_tone` (default: "profesional")

#### Scenario: Tono override
- **WHEN** el usuario selecciona un tono (breve, cálida, técnica)
- **THEN** ese tono se envía como `ai_tone` en el body y overridea el de settings

### Requirement: Instrucciones custom del vendedor
El copiloto SHALL incorporar `company_settings.ai_custom_instructions` en el system prompt.

#### Scenario: Instrucciones configuradas
- **WHEN** `ai_custom_instructions` no es null
- **THEN** se agrega al system prompt: "Instrucciones adicionales del vendedor: <instructions>"

### Requirement: Sugerencias CRM proactivas
El copiloto SHALL detectar campos faltantes en el CRM del producto y sugerir completarlos.

#### Scenario: Producto sin datos CRM
- **WHEN** el producto existe pero faltan campos (support_summary, key_points, shipping_notes, etc.)
- **THEN** devuelve `crm_suggestions` con mensajes específicos por campo faltante y `tab` para navegar

#### Scenario: Pregunta sin producto asociado
- **WHEN** `product_id` es null o undefined
- **THEN** sugiere "Creá una ficha CRM para este producto"

### Requirement: Modelo de IA y manejo de errores
El copiloto SHALL usar Lovable AI Gateway como proveedor de IA y manejar errores de rate limit, créditos, y parseo.

#### Scenario: Respuesta exitosa
- **WHEN** el LLM responde correctamente
- **THEN** parsea el JSON (con limpieza de markdown/backticks)
- **AND** devuelve el objeto estructurado al cliente

#### Scenario: Rate limit (429)
- **WHEN** Lovable AI Gateway devuelve 429
- **THEN** el copiloto devuelve 429 con mensaje "Demasiadas solicitudes. Esperá un momento y volvé a intentar."

#### Scenario: Créditos agotados (402)
- **WHEN** Lovable AI Gateway devuelve 402
- **THEN** el copiloto devuelve 402 con mensaje "Créditos de IA agotados. Recargá desde la configuración del workspace."

#### Scenario: Respuesta truncada
- **WHEN** `finish_reason` es "length" o "MAX_TOKENS"
- **THEN** se loguea warning pero se devuelve la respuesta parseada igual

#### Scenario: JSON parse failure
- **WHEN** el LLM devuelve texto que no es JSON válido
- **THEN** intenta limpieza agresiva (strip markdown, fix trailing commas, remove control chars)
- **AND** si sigue fallando, devuelve el texto raw como `draft` con `summary` genérico

### Requirement: Autopilot
El copiloto SHALL poder ejecutarse automáticamente para responder preguntas sin intervención humana, según la configuración de autopilot.

#### Scenario: Autopilot habilitado
- **WHEN** `company_settings.auto_reply_enabled = true` y la confianza supera `autopilot_confidence_threshold`
- **THEN** `sync-meli-questions` invoca la lógica de autopilot automáticamente
- **AND** la respuesta se publica en Mercado Libre via `publish-meli-answer`
- **AND** la pregunta se marca con `status = 'auto_published'`