---
name: Billing Mercado Pago
description: Sistema de suscripciones recurrentes vía MP Preapproval con webhook HMAC. Reemplaza Stripe.
type: feature
---
Stripe fue **eliminado completamente** del proyecto. Billing actual:

**Stack**: Mercado Pago Preapproval (suscripciones recurrentes en ARS).

**Edge Functions**:
- `mp-create-subscription`: crea preapproval con `external_reference = company_id` y devuelve `init_point` para redirección.
- `mp-check-subscription`: lee `companies` y sincroniza con `GET /preapproval/{id}` cuando hay `mp_preapproval_id`.
- `mp-cancel-subscription`: PUT al preapproval con `status: paused` (no cancelled). Solo admins de la company.
- `mp-webhook`: recibe `subscription_preapproval` IPN, valida HMAC SHA-256 con `MP_WEBHOOK_SECRET` (manifest: `id:DATA_ID;request-id:REQ_ID;ts:TS;`), responde siempre 200.

**Schema en `companies`**:
- `mp_preapproval_id text` — ID del preapproval activo en MP
- `billing_status text` — free | pending | authorized→active | paused | cancelled
- `plan text` — free | base
- `billing_period_end timestamptz` — `next_payment_date` del preapproval

**Tabla `mp_webhook_events`**: log append-only de todos los IPN, RLS solo super admin.

**Secrets requeridos**: `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MP_PREAPPROVAL_PLAN_ID`.

**Reglas**:
- Cancelación = pausa (no destructiva). El usuario puede reactivar desde su cuenta MP sin re-checkout.
- Super admin (`gonzoblasco@icloud.com`) bypassa siempre el check de billing.
- `admin-create-user` con `plan: "base"` solo marca DB; no crea preapproval (lo hace el usuario desde Settings).
- Webhook responde 200 incluso ante errores para evitar retries infinitos de MP.
