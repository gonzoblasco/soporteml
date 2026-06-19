# Roadmap urgente — análisis y plan

## 1. Las 5 features más urgentes

Cada una está rankeada por **impacto en retención/reputación × frecuencia de uso × esfuerzo**.

### a) Mensajería post-venta de Mercado Libre
Hoy SoporteML solo cubre **preguntas pre-venta**. El daño real a la reputación ocurre después de la compra: "no llegó", "vino fallado", "quiero devolver". Esos mensajes viven en el módulo *Mensajes* de MeLi (`/messages/packs/...`) y la app está ciega ahí. Es el feature más pedido implícitamente porque resuelve el problema de negocio principal del seller: evitar reclamos.

### b) Gestión de reclamos (Claims / Mediaciones)
Cuando se abre un claim, el seller tiene 48h para responder o pierde plata. Hoy se enteran por mail de MeLi y entran al panel viejo. Centralizarlos en SoporteML con IA sugerida y SLA visible es alto impacto y diferenciador.

### c) SLA tracking + alertas de escalation
Ya guardamos `created_at` y `answered_at` por pregunta. Falta surfacing accionable: timer visible, target configurable por empresa, alerta (browser push + email) cuando una pregunta supera el umbral. Es la feature de **menor esfuerzo, mayor impacto operativo** porque convierte data existente en comportamiento.

### d) Bulk actions en el Inbox
Responder/archivar/asignar múltiples preguntas similares en una sola acción. Hoy todo es 1×1, lo que duele en empresas con >50 preguntas/día. Ganancia de productividad inmediata, esfuerzo bajo.

### e) Multi-cuenta MeLi por empresa
La restricción `1 cuenta MeLi por empresa` bloquea sellers que operan varios CUITs/marcas. Desbloquea ventas hacia el segmento medio-alto. Esfuerzo medio (toca OAuth, sync, scoping) y no urgente para los usuarios actuales — más estratégico que urgente.

## 2. Las 3 primordiales (conclusión)

| # | Feature | Por qué entra al podio |
|---|---|---|
| 1 | **SLA tracking + escalation** | Mejor ratio impacto/esfuerzo. Convierte data ya existente en alertas accionables. Base necesaria para medir el éxito de las otras dos. |
| 2 | **Mensajería post-venta** | Cierra el agujero principal del producto: hoy solo cubrimos un tercio del ciclo de atención del seller. |
| 3 | **Gestión de reclamos** | Donde el seller pierde plata real. Apalanca lo construido en (1) y (2) — claims son el caso extremo de SLA + post-venta. |

Bulk actions y multi-cuenta quedan en backlog cercano: bulk se puede meter como mejora UX durante la fase 1, multi-cuenta amerita un proyecto propio post-podio.

## 3. Plan de implementación

### Fase 1 — SLA tracking + escalation (~1 sprint)

**Objetivo:** que ninguna pregunta pase desapercibida después del umbral configurado.

- **DB:** agregar `companies.sla_target_minutes` (default 60) y `companies.sla_escalation_enabled` (bool).
- **Cálculo:** view o columna derivada `questions.sla_status` (`on_track` | `at_risk` | `breached`) usando `created_at` y `answered_at` / `now()`. Se materializa client-side para el listado y server-side para alertas.
- **UI Inbox:** chip de tiempo con color (verde/ámbar/rojo) + ordenamiento por "más urgente". Filtro nuevo "Por vencer / Vencidas".
- **UI Settings → Operación:** input de SLA target en minutos + toggle de alertas.
- **Alertas:**
  - Realtime en la UI cuando una pregunta cruza umbral (reusar canal `inbox-realtime`).
  - Notificación browser push (ya existe la infra de `NotificationBell`).
  - Email opcional al admin (edge function `notify` extendida).
- **Analytics:** sumar tarjeta "Cumplimiento de SLA (%)" y serie diaria en `/analytics`.

### Fase 2 — Mensajería post-venta (~2 sprints)

**Objetivo:** unificar preguntas y mensajes post-venta en un solo inbox.

- **OAuth scope:** verificar y, si falta, sumar `read messages` y `write messages` al PKCE (memoria `meli-oauth-pkce`).
- **DB nueva:**
  - `conversations` (id, company_id, meli_pack_id, buyer_id, order_id, last_message_at, sla_status, status).
  - `messages` (id, conversation_id, direction, body, sent_at, meli_message_id, attachments jsonb, ai_draft, ai_confidence).
  - RLS company-scoped + grants estándar.
- **Sync:** nueva edge function `sync-meli-messages` (cron + webhook topic `messages`) reutilizando refresh-token resilience existente.
- **UI:**
  - Pestaña "Mensajes" en sidebar al lado de Inbox.
  - Vista threaded estilo chat con drawer de detalle del pedido (item + envío) llamando a `meli-item-proxy` extendido.
  - AI Copilot adaptado: prompt con contexto de orden (estado de envío, fecha de entrega, comprador frecuente).
- **Templates:** soporte de variables nuevas `{numero_orden}`, `{tracking}`, `{estado_envio}`.
- **SLA:** reutilizar el motor de fase 1 con target distinto (configurable separado).

### Fase 3 — Gestión de reclamos (~2 sprints)

**Objetivo:** evitar que se pierdan plazos de claims/mediaciones.

- **Sync:** edge function `sync-meli-claims` (cron + webhook topic `claims`). Endpoint `/post-purchase/v1/claims/search`.
- **DB:**
  - `claims` (id, company_id, meli_claim_id, order_id, buyer_id, type, status, stage, reason_code, deadline_at, opened_at, last_action_at).
  - `claim_messages` (interacciones del claim, mismo patrón que `messages`).
- **UI:**
  - Página `/claims` con tabs por estado (Abiertos / En mediación / Cerrados).
  - Card con countdown grande al deadline (rojo si <24h).
  - AI Copilot con prompt especializado para claims (tono empático, ofrecer solución concreta antes de mediación).
  - Acciones: responder, ofrecer reembolso parcial, escalar a humano.
- **Alertas:** dedicado, no se mezcla con inbox normal — push + email obligatorio para deadlines <24h.
- **Analytics:** tasa de claims resueltos sin mediación, deadline cumplido (%).

## 4. Detalles técnicos transversales

- Cada fase termina con entrada en `CHANGELOG.md` y actualización de memoria relevante (`mem://features/*`).
- Reusar patrones existentes: refresh de token MeLi con `refreshMeliToken.ts`, audit con `audit_logs`, autopilot con la decision engine ya documentada, embeddings KB para enriquecer drafts.
- Webhook único `meli-webhook` ya recibe varios topics — extender el switch en vez de crear funciones nuevas de recepción.
- Mantener restricción `h-screen` y diseño calmo del control center (memoria `layout-constraints` y `design-direction`).
- Mantener 1 cuenta MeLi por empresa (no se toca en este podio).

## 5. Secuencia y entregables

```text
Sprint 1: SLA tracking + escalation (Fase 1)         -> entrega valor inmediato
Sprint 2-3: Mensajería post-venta (Fase 2)           -> cierra el ciclo de atención
Sprint 4-5: Gestión de reclamos (Fase 3)             -> protege ingresos del seller
```

Después de aprobado, arranco por Fase 1 que es independiente y desbloquea métricas para validar el impacto real de las fases siguientes.
