# Spec: Billing Mercado Pago

## Purpose

Gestionar suscripciones mensuales via Mercado Pago Preapproval. Crear, verificar, pausar, y recibir webhooks IPN para mantener el estado de billing sincronizado.

> **Estado actual:** Código escrito pero NUNCA operativo. Secrets no configurados, plan de preapproval no creado en MP.

## Requirements

### Requirement: Suscripciones recurrentes con Mercado Pago Preapproval
El sistema SHALL gestionar suscripciones mensuales via Mercado Pago Preapproval, permitiendo crear, verificar, pausar y recibir webhooks de cambios de estado.

#### Scenario: Crear suscripción
- **WHEN** el usuario inicia la suscripción desde Settings → Plan
- **THEN** la Edge Function `mp-create-subscription` valida JWT y deriva `company_id` via `get_user_company_id`
- **AND** si ya tiene `billing_status = 'active'` y `mp_preapproval_id`, devuelve `{ already_subscribed: true }`
- **AND** si no, crea un preapproval en MP API con `MP_PREAPPROVAL_PLAN_ID`, `payer_email`, `external_reference = companyId`, `back_url`
- **AND** guarda `mp_preapproval_id` en `companies` y devuelve `{ checkout_url }` al cliente

#### Scenario: Verificar suscripción
- **WHEN** el sistema necesita conocer el estado de billing
- **THEN** la Edge Function `mp-check-subscription` valida JWT y deriva `company_id`
- **AND** consulta MP API `GET /preapproval/{id}` con el `mp_preapproval_id` guardado
- **AND** actualiza `companies.billing_status` y `billing_period_end` según la respuesta

#### Scenario: Cancelar (pausar) suscripción
- **WHEN** un admin pausa la suscripción desde Settings → Danger zone
- **THEN** la Edge Function `mp-cancel-subscription` valida JWT, deriva `company_id`, y verifica rol admin via `has_membership_role(_role: 'admin')`
- **AND** llama a MP API `PUT /preapproval/{id}` con `status = "paused"`
- **AND** actualiza `companies.billing_status = 'paused'`

### Requirement: Webhook IPN de Mercado Pago
El sistema SHALL recibir webhooks de MP para mantener el estado de billing sincronizado.

#### Scenario: Webhook de preapproval
- **WHEN** MP envía un evento `subscription_preapproval`
- **THEN** la Edge Function `mp-webhook` valida la firma HMAC SHA-256 (`x-signature` header con `MP_WEBHOOK_SECRET`)
- **AND** si `MP_WEBHOOK_SECRET` no está configurado, loguea warning pero continúa (back-compat)
- **AND** loguea el evento en `mp_webhook_events`
- **AND** consulta `GET /preapproval/{id}` para obtener el estado actual
- **AND** actualiza `companies.billing_status`, `plan`, y `billing_period_end` según el estado

#### Scenario: Webhook de otro tipo
- **WHEN** MP envía un evento que no es `subscription_preapproval`
- **THEN** se loguea en `mp_webhook_events` pero no se procesa

### Requirement: Validación HMAC
El webhook SHALL validar la firma de MP cuando el secret está configurado.

#### Scenario: Firma válida
- **WHEN** `MP_WEBHOOK_SECRET` está configurado y `x-signature` matches
- **THEN** el evento se procesa normalmente

#### Scenario: Firma inválida
- **WHEN** `MP_WEBHOOK_SECRET` está configurado y `x-signature` no matches
- **THEN** devuelve 401 "invalid signature"

#### Scenario: Secret no configurado
- **WHEN** `MP_WEBHOOK_SECRET` no está configurado
- **THEN** loguea "WARN: MP_WEBHOOK_SECRET not configured, skipping signature check" y procesa el evento

### Requirement: Estados de billing
El sistema SHALL tracking el estado de billing en `companies.billing_status`.

#### Scenario: Estados válidos
- **WHEN** el estado cambia
- **THEN** `billing_status` puede ser: `free`, `active`, `paused`, `cancelled`, `pending`
- **AND** `plan` puede ser: `free`, `base`

### Requirement: Secrets requeridos (NO configurados actualmente)
Para que el billing funcione, se MUST configurar 3 secrets en Supabase Vault / Lovable Cloud.

#### Scenario: Secrets faltantes
- **WHEN** `MP_ACCESS_TOKEN` o `MP_PREAPPROVAL_PLAN_ID` no están configurados
- **THEN** `mp-create-subscription` lanza error "MP credentials not configured"
- **AND** el billing no funciona

#### Scenario: Secrets completos (futuro)
- **WHEN** los 3 secrets estén configurados y el plan de preapproval exista en MP
- **THEN** el flujo completo de billing funciona end-to-end