# thread-summary Specification

## Purpose
TBD - created by archiving change unified-threads-ai-summary. Update Purpose after archive.
## Requirements
### Requirement: Resumen IA del hilo
El sistema SHALL mostrar un resumen auto-generado arriba del detalle de un hilo con 2+ preguntas, con 3-4 viñetas (≤60 palabras) cubriendo temas, intención del comprador y pendientes.

#### Scenario: Hilo con 2+ preguntas sin resumen cacheado
- **WHEN** el usuario abre el detalle de un hilo con 2+ preguntas y no hay resumen cacheado válido
- **THEN** el componente `ThreadSummary` llama a la Edge Function `summarize-thread` con `{ company_id, buyer_id, product_id }`
- **AND** muestra un skeleton de 2 líneas mientras carga
- **AND** la Edge Function resuelve las preguntas del hilo, calcula `questions_hash` (sha256 de IDs + `final_answer` ordenados)
- **AND** si existe resumen con mismo hash, lo devuelve desde cache
- **AND** si no, llama a Lovable AI Gateway (`gemini-2.5-flash-lite`) con prompt en rioplatense neutro
- **AND** hace upsert en `thread_summaries` y devuelve el resumen

#### Scenario: Hilo con resumen cacheado válido
- **WHEN** el usuario abre un hilo y el hash calculado matchea el cacheado en DB
- **THEN** se devuelve el resumen desde cache sin llamar al LLM

#### Scenario: Nueva pregunta invalida el cache
- **WHEN** llega una pregunta nueva al hilo (via Realtime o refetch)
- **THEN** el hash de IDs cambia
- **AND** al reabrir el detalle, se regenera el resumen

#### Scenario: Hilo con 1 sola pregunta
- **WHEN** el hilo tiene solo 1 pregunta
- **THEN** no se muestra el bloque de resumen

#### Scenario: Error en la generación del resumen
- **WHEN** la Edge Function falla (LLM error, timeout, etc.)
- **THEN** se muestra mensaje sutil "No se pudo generar el resumen" con botón reintentar
- **AND** no bloquea el resto del detalle

### Requirement: Tabla thread_summaries
El sistema SHALL persistir los resúmenes en la tabla `thread_summaries` con PK lógica `(company_id, buyer_id, product_id)`.

#### Scenario: Estructura de la tabla
- **WHEN** se crea la migración
- **THEN** la tabla tiene: `id`, `company_id`, `buyer_id`, `product_id`, `summary text`, `questions_hash text`, `model text`, `created_at`, `updated_at`
- **AND** RLS + GRANTs estándar (authenticated lectura/escritura solo a su company, service_role full)
- **AND** índice único en `(company_id, buyer_id, product_id)`

### Requirement: Edge Function summarize-thread
La Edge Function `summarize-thread` SHALL validar JWT, derivar `company_id` server-side, y usar Lovable AI Gateway para generar el resumen.

#### Scenario: Request válida
- **WHEN** llega una request con `{ company_id, buyer_id, product_id }` y JWT válido
- **THEN** valida membership con `user_belongs_to_company`
- **AND** resuelve las preguntas del hilo (no deleted, ordenadas por `created_at`)
- **AND** calcula `questions_hash`
- **AND** si hay cache válido, lo devuelve
- **AND** si no, llama al LLM, hace upsert, y devuelve el resumen

#### Scenario: Request sin JWT o sin membership
- **WHEN** no hay JWT o el usuario no pertenece a la empresa
- **THEN** devuelve 401/403 respectivamente

#### Scenario: Hilo con menos de 2 preguntas
- **WHEN** el hilo tiene 0 o 1 pregunta
- **THEN** devuelve `{ summary: null }` sin llamar al LLM

