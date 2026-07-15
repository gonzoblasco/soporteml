## MODIFIED Requirements

### Requirement: Absorción de hilos por Priority Inbox
Cuando un hilo tiene al menos una pregunta con `requires_human = true`, todas las preguntas abiertas de ese hilo (incluyendo las que no son priority) SHALL mostrarse agrupadas en Priority Inbox y SHALL desaparecer del Inbox normal, sin duplicados.

#### Scenario: Hilo mixto (priority + normal) en Priority Inbox
- **WHEN** existe un par `(buyer_id, product_id)` con al menos una pregunta `requires_human = true`
- **THEN** `fetchPriorityThreadKeys` calcula el set de claves de hilos priority
- **AND** Priority Inbox hace un segundo query trayendo todas las preguntas de la company que matcheen esos pares
- **AND** se unifican, deduplican por `id`, y se pasan al `groupQuestions` existente
- **AND** cada card puede contener preguntas que individualmente no son priority pero pertenecen al hilo

#### Scenario: Hilo mixto desaparece del Inbox normal
- **WHEN** el Inbox carga preguntas pendientes
- **THEN** calcula el set de pares `(buyer_id, product_id)` que están en algún hilo priority
- **AND** filtra las preguntas cuyo `threadKey` está en ese set
- **AND** no quedan duplicados entre Inbox y Priority Inbox

#### Scenario: Indicador visual de hilo mixto
- **WHEN** una card de Priority Inbox agrupa preguntas de ambos tipos (priority + normales)
- **THEN** muestra un badge "N (M urg.)" donde N es el total y M es la cantidad de urgentes

#### Scenario: Nueva pregunta llega a hilo priority via Realtime
- **WHEN** llega una pregunta nueva (priority o normal) a un hilo que ya está en Priority Inbox
- **THEN** el refetch de Realtime reevalúa la pertenencia
- **AND** la pregunta aparece sola en Priority Inbox sin necesidad de refresh manual

#### Scenario: Pregunta priority "salta" del Inbox al Priority
- **WHEN** una pregunta pendiente en el Inbox recibe `requires_human = true`
- **THEN** el siguiente refetch de Realtime recalcula `priorityKeys`
- **AND** la pregunta desaparece del Inbox y aparece en Priority Inbox