# Plan de trabajo — SoporteML v1 (Lovable)

> Fecha: 2026-07-15
> Stack: React + Vite + TS + shadcn/ui + Supabase + pgvector + Lovable AI Gateway
> Repo: github.com/gonzoblasco/soporteml (rama `el-upgrade`)

---

## 🎯 Objetivo

Usar SoporteML v1 como **esqueleto vivo** de todas las historias. El stack real, funcionando, con features reales. No teoría — código que corre en Lovable.

---

## 📋 Estado actual

### ✅ Features implementadas (release 0.1.0)
- Inbox inteligente (tabs, búsqueda, agrupación por hilo)
- Priority Inbox con absorción de hilos mixtos
- Respuestas IA con RAG (pgvector + OpenAI embeddings)
- Knowledge Base con búsqueda semántica
- Thread summaries (resumen IA por hilo)
- Dashboard + Analytics reales (KPIs, charts, export CSV)
- Settings consolidado (Agente IA, Cuenta, Integraciones, Avanzado)
- Admin panel multi-tenant (usuarios, roles, empresas)
- Integración MeLi (OAuth, sincronización, proxy, publicación)
- Notificaciones (in-app, push, vibración mobile)
- Landing page + SEO (sitemap, robots, llms.txt)
- Dark/Light mode + responsive + mobile
- SLA tracking + alertas por email (Resend)
- Clientes (CRM liviano de buyers MeLi)
- Sign in con Google
- OpenSpec specs (4 as-built: inbox, ai-copilot, billing-mp, thread-summary)

### ❌ No funciona
- **Billing MP** — código escrito pero nunca operativo. Secrets no configurados, plan de preapproval no creado.

### 🧱 Estructura
- 24 tablas, 25 Edge Functions, 54 migraciones SQL
- ~65 componentes, 10 páginas
- Dependencia Lovable: `@lovable.dev/cloud-auth-js` (no corre local)

---

## 🗺️ Roadmap

### Fase 1 — Billing real 🥇
**Hacer operativo el billing de Mercado Pago.**

- [ ] Configurar secrets en Supabase Vault / Lovable Cloud:
  - `MP_ACCESS_TOKEN` (access token de la app de MP)
  - `MP_WEBHOOK_SECRET` (para validar IPN)
  - `MP_PREAPPROVAL_PLAN_ID` (ID del plan de suscripción)
- [ ] Crear plan de preapproval en Mercado Pago
- [ ] Configurar webhook IPN en MP apuntando a la Edge Function
- [ ] Probar flujo completo: crear suscripción → webhook → verificar estado
- [ ] Agregar UI de estado de billing en Settings (ya existe, probar que funcione)
- [ ] Documentar el proceso para futuras réplicas

**Por qué primero:** Es la puerta de entrada a ingresos reales. Sin billing, el producto no genera plata.

---

### Fase 2 — Hardening y deuda técnica 🛡️
**Cerrar agujeros y ordenar la casa.**

- [ ] **Tests:** agregar tests unitarios a componentes críticos (Inbox, QuestionCard, AICopilotPanel)
- [ ] **Seguridad:** revisar que todas las Edge Functions tengan validación JWT + membership check
- [ ] **Logs:** revisar que errores no filtren información interna al cliente
- [ ] **Rendimiento:** revisar queries N+1 en Inbox y PriorityInbox
- [ ] **Accesibilidad:** auditar páginas principales con axe-core (la base ya está, verificar)
- [ ] **Historias de git:** limpiar commits genéricos ("Changes") — squash opcional

---

### Fase 3 — Features nuevas 🚀
**Lo que sigue después de estabilizar.**

- [ ] **Auto-respuesta inteligente** — IA clasifica rutinaria vs compleja, auto-responde, badge "Auto IA", auditable
- [ ] **Auto-learn de MeLi** — al conectar, fetch histórico + generar KB + fichas automáticamente
- [ ] **Webhooks de MeLi** — push real de preguntas (vs polling)
- [ ] **Múltiples marketplaces** — extensión a otras plataformas
- [ ] **KanamAI integration** — reemplazar Lovable AI Gateway por KanamAI como motor de IA

---

### Fase 4 — Migración a stack propio 🏗️
**Salir de Lovable.**

- [ ] Reemplazar `@lovable.dev/cloud-auth-js` por Supabase Auth directo
- [ ] Migrar Edge Functions a stack local (o mantener en Lovable Cloud)
- [ ] Opcional: reconstruir como SoporteML v2 (ya hay scaffold)

---

## 🧠 Principios

1. **Primero que funcione, después que brille** — billing real antes que features nuevas
2. **Código que corre > teoría** — cada historia se implementa en este repo
3. **Deuda técnica se paga en Fase 2** — no mezclar con features nuevas
4. **Documentar mientras se hace** — cada feature nueva lleva su spec o actualización
5. **Un feature por vez** — no abrir frentes paralelos

---

## 📊 Métricas de éxito

- Billing: primer pago real recibido ✅
- Tests: cobertura > 30% en componentes críticos
- Bugs: 0 issues de seguridad conocidos
- Features: 1 feature nueva deployada por semana (post-billing)
