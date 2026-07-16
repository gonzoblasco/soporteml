# HANDOFF — SoporteML v1 (Lovable)

> Fecha: 2026-07-15 22:12 GMT-3
> Sesión: Kanam (Mini) → deepseek-v4-flash
> Proyecto: `projects/soporteml/`

---

## Estado actual

### Billing MP — Fase 1 en progreso

**✅ Completado:**
- Plan de suscripción creado en MP Sandbox: `cbb78b7389f84ce695920a1fab6e048a` ($29 ARS test)
- 3 secrets configurados en Lovable Cloud:
  - `MP_ACCESS_TOKEN` = `TEST-2681678603522266-061222-58af0da09ec650e9375b4752f577192f-10061615`
  - `MP_PREAPPROVAL_PLAN_ID` = `cbb78b7389f84ce695920a1fab6e048a`
  - `MP_WEBHOOK_SECRET` = `ac0d03d170b0cc13e3bbdc17b1bd4ca4103fb2215fb01a3b1b66b96a4da0b009`
- Webhook de MP configurado apuntando a `https://ropbkdqhqdeiwrenrmjt.supabase.co/functions/v1/mp-webhook`
- Webhook probado: responde `{"received":true}` con firma HMAC válida
- Edge Functions de MP revisadas y sólidas (auth, multi-tenant, manejo de errores)
- Código actualizado con `X-Test-Secret` como modo de auth alternativo (commiteado en repo, NO deployado en Lovable)
- Script de test E2E: `scripts/test-billing-e2e.sh`
- `PLAN.md` creado con roadmap de 4 fases

**⏳ Pendiente (requiere Lovable con créditos):**
- Probar checkout desde Settings → Plan en SoporteML
- Verificar que webhook IPN de MP actualiza `companies.billing_status`
- En producción: cambiar `MP_ACCESS_TOKEN` a `APP_USR-...` y crear plan de $25.000 ARS

**⚠️ Issues conocidos:**
- Lovable no deploya cambios de código editados en el panel (las EFs siguen en versión vieja sin `X-Test-Secret`)
- No tenemos la anon key de Lovable Cloud para testear EFs desde afuera
- El JWT de sesión expira en 1h y no podemos refrescarlo sin la anon key

### Plan de trabajo completo
Ver `PLAN.md`:
1. Billing real ✅ (en progreso)
2. Hardening y deuda técnica
3. Features nuevas (auto-respuesta, auto-learn, más marketplaces)
4. Migración a stack propio

---

## Próxima sesión

1. Entrar a SoporteML desde Lovable (cuando haya créditos)
2. Ir a Settings → Plan → click en "Suscribirme con Mercado Pago"
3. Completar el checkout en MP Sandbox
4. Verificar que vuelve a SoporteML con `?billing=success`
5. Confirmar que `mp-check-subscription` detecta el cambio
6. Si funciona → celebrar 🎉
7. Si no → revisar logs de `mp-webhook` en Lovable

---

## Archivos clave

- `PLAN.md` — roadmap completo
- `scripts/test-billing-e2e.sh` — test E2E (requiere JWT fresco o X-Test-Secret deployado)
- `supabase/functions/mp-create-subscription/index.ts`
- `supabase/functions/mp-check-subscription/index.ts`
- `supabase/functions/mp-cancel-subscription/index.ts`
- `supabase/functions/mp-webhook/index.ts`
- `src/pages/SettingsPage.tsx` (líneas ~1320-1520) — componente BillingSection

## Secrets en Lovable

| Secret | Valor |
|---|---|
| `MP_ACCESS_TOKEN` | `TEST-2681678603522266-061222-58af0da09ec650e9375b4752f577192f-10061615` |
| `MP_PREAPPROVAL_PLAN_ID` | `cbb78b7389f84ce695920a1fab6e048a` |
| `MP_WEBHOOK_SECRET` | `ac0d03d170b0cc13e3bbdc17b1bd4ca4103fb2215fb01a3b1b66b96a4da0b009` |
| `MP_TEST_SECRET` | `df8bd3b2cfcb8289e07b8a5c76c7a72b` |
