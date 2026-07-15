# Spec: Inbox

## Purpose

Bandeja centralizada para gestionar preguntas de Mercado Libre de la empresa activa. Permite filtrar por estado, buscar, agrupar por hilo, trackear SLA, y absorber hilos que requieren atención humana hacia Priority Inbox.

## Requirements

### Requirement: Bandeja centralizada de preguntas
El sistema SHALL mostrar todas las preguntas de Mercado Libre de la empresa activa, agrupadas por comprador + producto, en una interfaz de dos columnas (lista + detalle).

#### Scenario: Pregunta nueva llega por webhook
- **WHEN** Mercado Libre envía un evento al webhook `meli-webhook`
- **THEN** la Edge Function `sync-meli-questions` sincroniza la pregunta a la tabla `questions`
- **AND** el Inbox recibe el evento via Supabase Realtime (`postgres_changes` en `questions`)
- **AND** la pregunta aparece automáticamente en la pestaña "Pendientes" sin refresh manual

#### Scenario: Filtro por estado
- **WHEN** el usuario selecciona una pestaña (Pendientes, Por vencer, Publicadas, Auto IA, Archivadas)
- **THEN** el sistema filtra `questions` por `status` correspondiente al tab activo
- **AND** en "Pendientes" excluye preguntas con `requires_human = true` (esas van a Priority Inbox)

#### Scenario: Búsqueda en tiempo real
- **WHEN** el usuario escribe en el campo de búsqueda
- **THEN** el sistema filtra las preguntas visibles por `product_title`, `buyer_id`, `ai_category`, o `question_text`
- **AND** la búsqueda es client-side sobre los datos ya cargados (sin query adicional)

### Requirement: Agrupación por hilo
Las preguntas del mismo comprador sobre el mismo producto SHALL agruparse visualmente como un hilo, usando `groupQuestions` (clave: `buyer_id + product_id`).

#### Scenario: Múltiples preguntas del mismo comprador+producto
- **WHEN** hay 2+ preguntas con el mismo `buyer_id` y `product_id`
- **THEN** se muestran agrupadas en una sola `GroupedQuestionCard`
- **AND** el contador muestra "N preguntas" en la card

### Requirement: Absorción de hilos por Priority Inbox
Cuando un hilo tiene al menos una pregunta con `requires_human = true`, todas las preguntas de ese hilo (incluyendo las que no son priority) SHALL desaparecer del Inbox normal y aparecer en Priority Inbox.

#### Scenario: Hilo mixto (priority + normal)
- **WHEN** existe un par `(buyer_id, product_id)` con al menos una pregunta `requires_human = true`
- **THEN** `fetchPriorityThreadKeys` calcula el set de claves de hilos priority
- **AND** el Inbox filtra las preguntas cuyo `threadKey` está en ese set
- **AND** Priority Inbox muestra todas las preguntas del hilo (priority + normales)

### Requirement: SLA tracking visual
Cada pregunta pendiente SHALL mostrar un chip de tiempo con color según el SLA configurado (`company_settings.sla_target_minutes`, default 60 min).

#### Scenario: Pregunta dentro del SLA
- **WHEN** la pregunta no ha sido respondida y faltan más de 25% del target o más de 15 min
- **THEN** el chip muestra "vence en X min" en verde

#### Scenario: Pregunta por vencer
- **WHEN** falta 25% o menos del target o 15 min o menos
- **THEN** el chip muestra "por vencer" en ámbar

#### Scenario: Pregunta vencida
- **WHEN** el tiempo transcurrido supera `sla_target_minutes`
- **THEN** el chip muestra "vencida hace X min" en rojo

### Requirement: Navegación por teclado
El Inbox SHALL soportar navegación con flechas ↑/↓ para moverse entre preguntas de la lista.

#### Scenario: Flecha abajo
- **WHEN** el usuario presiona ArrowDown y hay una pregunta siguiente
- **THEN** se selecciona la siguiente pregunta de la lista

#### Scenario: Flecha arriba
- **WHEN** el usuario presiona ArrowUp y no está en la primera
- **THEN** se selecciona la pregunta anterior

### Requirement: Realtime
El Inbox SHALL actualizarse automáticamente cuando llegan nuevas preguntas o cambian las existentes, sin requerir refresh manual.

#### Scenario: Cambio en tabla questions
- **WHEN** cualquier cambio ocurre en `questions` para la empresa activa
- **THEN** el canal Realtime `inbox-realtime` detecta el cambio
- **AND** se re-ejecuta `fetchQuestions` para refrescar la lista