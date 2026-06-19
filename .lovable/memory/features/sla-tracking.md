---
name: SLA Tracking & Escalation
description: SLA configurable por empresa con chip de tiempo en Inbox, pestaña "Por vencer" y alertas browser push al vencimiento. KPIs de cumplimiento en Analytics.
type: feature
---
- Settings viven en `company_settings.sla_target_minutes` (default 60, rango 5–1440) y `sla_escalation_enabled` (default true).
- Lógica centralizada en `src/lib/sla.ts` (`computeSlaInfo`). Estados: `on_track`, `at_risk` (≤25% del target o ≤15 min restantes, lo más amplio), `breached`, `met`, `missed`.
- Hook compartido `src/hooks/useSlaSettings.ts` resuelve los valores por empresa.
- Chip de SLA se muestra solo en preguntas pending sin `answered_at`, y solo cuando el estado es `at_risk` o `breached` (verde "on track" se omite para reducir ruido visual).
- Pestaña **"Por vencer"** en `Inbox.tsx` reutiliza la query de `pending` y filtra/ordena client-side por urgencia.
- Alertas en `DashboardLayout`: poll cada 60s sobre `questions` pending de `currentCompanyId`; dedupe por id en un `Set` ref por sesión; reset al cambiar empresa.
- Analytics: RPC `get_company_analytics` retorna `sla_target_minutes`, `sla_compliance_pct`, `sla_answered_in_target/total`, `sla_pending_breached`. UI muestra dos KPIs adicionales en `/analytics`.
- Próximas fases (post-venta y reclamos) reutilizarán el mismo motor con targets independientes.
