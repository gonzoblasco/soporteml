# Changelog

Todos los cambios notables de SoporteML se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [2.0.0] — 2026-03-09

### 🏢 Multi-Company — Cierre del Epic (Hitos 1-6)

#### Cambiado

- **Frontend migrado completamente a `currentCompanyId`** — todos los componentes (incluyendo `TemplatePicker`, `AICopilotPanel`, y secciones internas de `SettingsPage`: `AiConfigSection`, `TrashSection`) ahora usan `currentCompanyId` en vez del alias legacy `companyId`.
- **Backend migrado a memberships** — funciones admin (`get_admin_users`, `get_admin_company_metrics`) ahora leen desde `memberships` en vez de `profiles.company_id`.
  - `get_admin_users()`: devuelve campo `memberships` (JSONB array) con todas las companies del usuario, manteniendo `company_id` y `role` legacy para compatibilidad.
  - `get_admin_company_metrics()`: cuenta miembros usando `COUNT(DISTINCT user_id)` desde `memberships` activas, corrigiendo conteo para usuarios multi-company.
- **`companyId` oficialmente deprecated** — alias legacy en `AuthContext` será removido en v2.1.0.

#### Epic completado

El sistema multi-company está cerrado y operativo con:
- ✅ Memberships como fuente única de verdad (base de datos + backend)
- ✅ Switcher UI funcional para cambio de tenant
- ✅ Isolation estricto por `currentCompanyId` (frontend reactivo)
- ✅ Admin panel adaptado a multi-company (usuarios pueden tener múltiples empresas)
- ✅ Invite flow compatible con múltiples memberships
- ✅ RLS y edge functions usando `get_user_company_id()` con fallback
- ✅ 0 referencias a `companyId` legacy fuera del alias deprecated en AuthContext

---

## [1.9.0] — 2026-03-09

## [1.8.0] — 2026-03-09

### 🏢 Multi-Company — Hito 4: Company Switcher UI

#### Añadido

- **`CompanySwitcher` component** (`src/components/CompanySwitcher.tsx`) — selector de empresa activa con tres modos:
  - **Sin memberships**: indicador vacío con texto "Sin empresa asignada".
  - **Una sola empresa**: badge compacto con ícono y nombre (sin dropdown, sin overhead UX innecesario).
  - **Múltiples empresas**: dropdown usable con checkmark en la empresa activa, label "Cambiar empresa activa" y listado de todas las companies del usuario.
- **Integración en `AppSidebar`** — el switcher aparece debajo del header de marca, visible en modo expandido y colapsado. En modo colapsado muestra solo el ícono de building con tooltip del nombre.
- **Persistencia automática** — usa la lógica de `setCurrentCompanyId()` del hito anterior que persiste en `localStorage`.

#### Cambiado

- **`AppSidebar.tsx`** — conteos de Priority/Inbox ahora filtran por `currentCompanyId` explícitamente (no solo por RLS) y el canal realtime se recrea al cambiar de empresa.
- **`Home.tsx`** — todas las queries del dashboard (preguntas, actividad reciente, estado de token MeLi) ahora filtran por `currentCompanyId` y el `useEffect` tiene `currentCompanyId` en sus deps. Al cambiar de empresa el dashboard se refresca completamente.
- **Toast de preguntas urgentes** — se resetea al cambiar de empresa para mostrar la alerta nuevamente si la nueva empresa tiene preguntas prioritarias.

#### Comportamiento garantizado

- **Un único tenant activo por vez** — nunca se mezclan datos entre compañías.
- **Todas las pantallas principales reaccionan** al cambiar `currentCompanyId`: Dashboard, Inbox, Priority, Settings, Catálogo, Plantillas.
- **Seguridad**: el switcher solo muestra empresas que pertenecen al usuario (filtradas desde `memberships` en `AuthContext`).

---

## [1.7.0] — 2026-03-09

### 🏢 Multi-Company — Hito 2: Compañía Activa en Frontend

#### Añadido

- **`memberships` como fuente de companies del usuario** — `AuthContext` ahora carga las memberships activas del usuario desde la tabla `memberships` al iniciar sesión, exponiendo `memberships[]` (lista de `{ company_id, role, is_default }`).
- **`currentCompanyId`** — nuevo campo en el contexto que representa la compañía sobre la que el usuario está trabajando actualmente.
- **`setCurrentCompanyId(id)`** — setter con validación: verifica que la company objetivo tenga una membership activa del usuario antes de cambiar. Si el ID es inválido, resetea al default o primera activa.
- **Persistencia en `localStorage`** (`sml_current_company`) — el `currentCompanyId` sobrevive refrescos de página. Al hacer logout se limpia automáticamente.
- **Cadena de fallback** para resolución de compañía activa:
  1. Valor en `localStorage` (si es membership activa válida)
  2. Membership con `is_default = true`
  3. Primera membership activa
  4. `profiles.company_id` (compatibilidad legacy)
- **Rol desde membership** — `userRole` se resuelve desde la membership de la compañía activa, con fallback a la tabla `user_roles` para usuarios sin memberships.

#### Compatibilidad temporal mantenida

- **`companyId` (legacy alias)** sigue expuesto en el contexto y siempre apunta a `currentCompanyId`. Todo el código existente que consume `companyId` funciona sin cambios.
- **RLS policies sin cambios** — siguen usando `get_user_company_id()` (lee `profiles.company_id`). No se modificaron Edge Functions ni políticas de base de datos.
- **Sin cambios visuales** — este hito es exclusivamente de state management. No hay company switcher UI todavía.

---

## [1.5.0] — 2026-03-08

### 🔧 Base Multi-Company — Hito 1

#### Añadido
- **Tabla `memberships`** para la base de datos multi-company — introducida con estructura completa para futuro soporte de usuarios pertenecientes a múltiples empresas. Incluye validación de estado (`active`, `invited`, `disabled`), constraint para una sola company default por usuario, y políticas RLS.
- **Funciones SQL helper** para consultas multi-company: `get_user_active_companies()` (devuelve companies activas de un usuario), `get_user_default_company()` (obtiene company default con fallback), `user_belongs_to_company()` (valida membership activa).
- **Migración automática de datos** — todos los usuarios existentes con `profiles.company_id` fueron migrados a `memberships` con estado `active` e `is_default = true`.

#### Importante — Compatibilidad Temporal
- **`profiles.company_id` se mantiene** como fuente de verdad para RLS y frontend (sin cambios).
- **`user_roles` se mantiene** intacto. Aplicación actual funciona exactamente igual.
- **Lógica de frontend y Edge Functions** sin cambios — este hito es solo de base de datos.
- Las nuevas funciones helper coexisten con `get_user_company_id()` para preparar futuras migraciones.

---

## [1.4.4] — 2026-03-08

### Cambiado
- Onboarding solo se muestra para admins nuevos en su empresa (primera vez). Super Admin lo saltea automáticamente.

## [1.4.3] — 2026-03-08

### ✨ Mejoras

- **Admin: creación de empresa con asignación de usuario** — Al crear una empresa desde `/admin` → Companies, ahora se puede asignar un usuario existente (sin empresa) como admin inicial. Si no se asigna, se muestra prominentemente el invite code y link de invitación. Badge "Sin usuarios" en empresas vacías. Botón de copiar link de invitación en cada fila.

---

## [1.4.2] — 2026-03-08

### ✨ Mejoras

- **Panel Admin: nueva pestaña Métricas** — Dashboard con totales globales (preguntas, respuestas automáticas/humanas, productos) y tabla de uso desglosado por empresa. Usa RPC `get_admin_company_metrics` con `SECURITY DEFINER` y validación de super admin.

---

## [1.4.1] — 2026-03-07

### 🔒 Auditoría Multi-Tenant & Fix de Seguridad

#### Corregido

- **sync-meli-questions: fix cross-company vulnerability** — Las llamadas de usuario ahora se limitan estrictamente a la empresa del caller via `get_user_company_id()`. Antes, un usuario autenticado podía disparar sync para todas las empresas.

#### Validado

- Auditoría completa del modelo multi-tenant: todas las tablas tienen `company_id` con RLS correcto.
- `meli_tokens` tiene constraint UNIQUE en `company_id` → impone 1 cuenta ML por empresa (v1).
- OAuth callback asocia token a compañía (no a usuario).
- Edge functions (`publish-meli-answer`, `ai-copilot`, `disconnect-meli`, `meli-item-proxy`) operan correctamente con company-scoping.
- UI (Dashboard, Inbox, Priority, Settings) usa RLS automático + `companyId` del AuthContext.

---

## [1.4.0] — 2026-03-06

### 🤖 Mega-Cambio: Autopilot con Guardrails + Base Firme

#### Añadido

- **Tabla `events`** (append-only audit trail): registra SYNC_STARTED, SYNC_DONE, AI_DECISION, AUTO_REPLY_SENT y ERROR con payload JSONB. RLS por empresa.
- **Columnas ML en `questions`**: `ai_confidence`, `answered_by_ai`, `ai_decision_reason`, `auto_action` (none/suggest/auto_reply), `meli_status`, `meli_permalink`.
- **Feature flags en `company_settings`**: `features_ai_suggestions`, `features_autopilot_after_hours`, `features_autopilot_in_hours`, `autopilot_confidence_threshold`.
- **State machine de preguntas**: nuevos estados `queued_auto`, `auto_published`, `needs_human` en el trigger `validate_question_status`.
- **Motor de decisión Autopilot** en `sync-meli-questions`: evalúa confidence score + horario comercial + feature flags para decidir auto_reply vs suggest vs needs_human. Failsafe: si publish falla → needs_human.
- **Evaluación de horario comercial**: función `isOutsideBusinessHours()` reutilizable con timezone Argentina (UTC-3).
- **Confidence scoring**: el prompt de IA ahora devuelve `confidence` (0-1) junto con la respuesta y categoría.
- **Event logging**: todas las decisiones de IA y errores se registran en la tabla `events` para trazabilidad completa.
- **Edge Function `health-check`**: verifica conectividad DB y devuelve status + latencia + timestamp.
- **Panel Autopilot en Settings**: toggles para autopilot fuera/dentro de horario, slider de umbral de confianza (0.5-1.0), chip visual del modo activo.
- **Tab "Auto IA" en Inbox**: muestra preguntas auto-publicadas por el autopilot.
- **Priority Inbox expandido**: ahora incluye preguntas con status `needs_human` además de `pending`.

#### Modificado

- **`sync-meli-questions`**: refactorizado con motor de decisión autopilot, event logging, y soporte para confidence scoring.
- **`src/types/question.ts`**: nuevos campos para ML metadata.
- **`src/pages/Inbox.tsx`**: tab adicional para auto_published.
- **`src/pages/PriorityInbox.tsx`**: incluye status `needs_human`.
- **`src/pages/SettingsPage.tsx`**: sección Auto-Respuesta expandida con panel Autopilot completo.

---

## [1.7.0] — 2026-03-09

### 🔒 Hito 3: Backend de Seguridad — Memberships como Fuente de Verdad

#### Cambiado

- **`get_user_company_id()`** ahora lee de `memberships` con fallback a `profiles.company_id` — para usuarios con 1 company el comportamiento es idéntico.
- **4 Edge Functions migradas** (`ai-copilot`, `enrich-product`, `detect-duplicates`, `meli-item-proxy`): ya no leen `profiles.company_id` directamente. Usan `rpc("get_user_company_id")` que lee de memberships con fallback. Error 403 "No active membership found" si no hay membership activa.
- **`Inbox.tsx` y `PriorityInbox.tsx`**: filtran explícitamente por `currentCompanyId` del `AuthContext`, garantizando aislamiento de tenant cuando un usuario tenga múltiples memberships.
- **RLS en 11 tablas** migradas a `user_belongs_to_company()` + `has_membership_role()`: `companies`, `company_settings`, `questions`, `products`, `product_variants`, `templates`, `audit_logs`, `events`, `dismissed_meli_questions`, `meli_tokens`, `profiles`.

#### Añadido

- **Nueva función SQL `get_user_company_ids()`** — retorna todas las companies activas del usuario.
- **Nueva función SQL `has_membership_role()`** — verifica rol por company via memberships.
- **`handle_new_user()` actualizado** — genera membership al dar de alta un usuario (empresa nueva o por invite code), cerrando el gap donde usuarios quedaban sin membership.

#### Notas de compatibilidad

- `profiles.company_id` no se toca ni elimina.
- `has_role()` se mantiene solo para `user_roles` (tabla legacy sin `company_id`, documentado).
- No se habilita trabajo cross-company simultáneo todavía.

---


## [1.3.0] — 2026-03-05

### 🔔 Epic 5 — Notificaciones & Engagement

#### Añadido

- **Tabla `notifications`** con RLS por usuario, realtime habilitado y políticas de lectura/actualización.
- **Edge Function `notify`**: genera notificaciones multi-usuario por empresa. Invocada desde `sync-meli-questions` para preguntas priority.
- **`NotificationBell`**: componente de campana en el sidebar con badge de no leídas en tiempo real (suscripción `postgres_changes`). Popover con últimas 20 notificaciones, marcar como leída individual o masiva, navegación por link.
- **Toast de bienvenida**: al entrar al Dashboard, si hay preguntas priority pendientes se muestra un toast de advertencia con el conteo.

#### Modificado

- **`sync-meli-questions`**: llama a `notify` al detectar preguntas que requieren atención humana.
- **`AppSidebar`**: integra `NotificationBell` en la sección inferior del sidebar.

---

## [1.2.0] — 2026-03-05

### ✨ Epic 6 — Polish UX & Mobile

#### Añadido

- **Skeleton loaders** (`SkeletonCards.tsx`): `KpiSkeleton`, `QuestionListSkeleton`, `ChartCardSkeleton`, `ProductListSkeleton`. Reemplazan spinners genéricos en Dashboard, Inbox y Priority Inbox.
- **Barra de acciones sticky** en `QuestionDetail` para mobile: botones Publicar/Archivar fijos en la parte inferior.
- **Swipe gestures** en `AppSidebar`: deslizar a la derecha para abrir y a la izquierda para cerrar en dispositivos táctiles.
- **Transiciones de página**: `AnimatePresence` de framer-motion en `DashboardLayout` con fade suave entre rutas.
- **Keyboard navigation**: flechas ↑↓ para navegar entre preguntas en Inbox y Priority Inbox.
- **Empty state mejorado** en Priority Inbox con animación de checkmark cuando no hay pendientes.
- **Animación `slide-from-left`** en `index.css` para entrada del sidebar.

#### Modificado

- **`QuestionDetail`**: oculta `ProductSideCard` en mobile, layout responsive con detección `useIsMobile`.
- **`Home.tsx`**, **`Inbox.tsx`**, **`PriorityInbox.tsx`**: integran skeleton loaders durante carga.

---

## [1.1.0] — 2026-02-26

### 🎨 Rediseño Visual — Estética MockupTabs

Tres fases de mejora visual para unificar la estética del preview (MockupTabs) con los componentes reales de la app, tomando lo mejor de cada uno.

### Cambiado

- **QuestionCard**: layout aplanado a una sola fila horizontal — `[CategoryBadge] [texto truncado] [buyer · tiempo]`. Padding reducido a `p-3`, bordes sutiles `border-border/30`, esquinas `rounded-md`. Se mantiene `showHumanReason` como fila condicional.
- **GroupedQuestionCard**: header colapsado con el mismo estilo compacto horizontal. Badge de cantidad y chevron alineados a la derecha en una sola fila. Funcionalidad de agrupación intacta.
- **QuestionDetail**: rediseñado con dos bloques visuales diferenciados:
  - **Bloque de pregunta**: fondo `bg-muted/50` con metadata inline (categoría + buyer + tiempo) y producto + precio como subtítulo.
  - **Bloque de respuesta IA**: fondo `bg-primary/5` con `border-primary/20`, icono Bot y label "Sugerencia IA".
  - Textarea editable y ProductSideCard mantenidos.

### Añadido

- **KPIs rápidos en Analytics**: fila de 3 tarjetas — "Respondidas hoy", "Tiempo promedio" (calculado real), "Pendientes" — con estilo MockupTabs (`bg-muted/50 border-border/30`).
- **Barras de progreso por categoría**: panel complementario al PieChart con porcentajes y barras coloreadas por categoría.
- **Ranking con toggle Productos/Compradores**: botón segmentado para alternar entre Top 5 Productos más consultados y Top 5 Compradores que más preguntan.
- **Alerta de token MeLi en Dashboard**: banner visual con 3 niveles de severidad (sin refresh token → reconectar, expirado → se renueva solo, próximo a expirar → informativo). Clickeable para ir a Settings.
- **Sidebar colapsable**: modo mini (solo iconos) en desktop con botón de toggle, tooltips en hover, badges visibles en ambos modos. Estado persistido en localStorage.

### Corregido

- **Preservación de refresh_token**: el sync de MeLi ya no sobreescribe `refresh_token` con `null` cuando la API no devuelve uno nuevo. Esto evitaba la renovación automática y forzaba reconexiones manuales.
- **Lógica de refresh centralizada**: nueva función compartida `refreshMeliToken.ts` con bloqueo optimista (`WHERE refresh_token = current`) para evitar condiciones de carrera en renovaciones concurrentes. Incluye retry automático tras conflicto de lock.
- **OAuth callback robusto**: protege el `refresh_token` existente en DB si MeLi no devuelve uno nuevo durante re-autenticación (check-then-update en vez de upsert ciego).
- **UI de estado de token mejorada**: Settings muestra "Última renovación", countdown de expiración y botón "Reintentar renovación" cuando el token expira con refresh disponible.
- **`getClaims` → `getUser` en todas las Edge Functions**: reemplazado `auth.getClaims(token)` (método inexistente en el SDK) por `auth.getUser()` en `ai-copilot`, `debug-meli`, `disconnect-meli`, `publish-meli-answer` y `sync-meli-questions`. Corrige error 500 "getClaims is not a function" en todas las funciones autenticadas.

### Seguridad

- **debug-meli autenticado**: el endpoint de diagnóstico ahora requiere JWT válido + verificación de super admin antes de exponer datos de token.
- **sync-meli-questions hardened**: llamadas con service role key ahora requieren `source: "cron"` en el body, rechazando invocaciones no autorizadas con 403.

---

## [1.0.0] — 2026-02-24

### 🎉 Release Inicial

Primera versión pública de SoporteML — plataforma de gestión de consultas con IA para vendedores de Mercado Libre.

### Añadido

- **Inbox inteligente** con tabs de estado (Pendientes, Publicadas, Archivadas) y búsqueda en tiempo real.
- **Agrupación automática** de preguntas del mismo comprador + producto en filas colapsables con badge de conteo.
- **Bandeja Prioritaria** para consultas que requieren atención humana inmediata, separada del flujo normal.
- **Respuestas con IA**: sugerencias inteligentes basadas en contexto del producto, con categorización automática (Precio, Stock, Técnico, Envío, Garantía).
- **Notificaciones in-app** (toast) con sonido diferenciado para consultas prioritarias vs. normales.
- **Notificaciones push del navegador** (Notification API) que funcionan con la pestaña en segundo plano.
- **Toggle de notificaciones** en Settings para activar/desactivar push por usuario.
- **Vibración** en dispositivos móviles para alertas prioritarias.
- **Dashboard analítico** con métricas clave de rendimiento.
- **Configuración avanzada**: perfil, conexión MeLi (OAuth), empresa, auto-respuesta IA (modo, tono, categorías, instrucciones, exclusiones), horario de atención.
- **Panel de administración** multi-tenant con gestión de usuarios y roles (admin/agente).
- **Integración nativa con Mercado Libre**: OAuth, sincronización bidireccional, proxy de items, publicación de respuestas.
- **Landing page** pública con contadores animados, mockups interactivos y formulario de contacto.
- **Dark/Light mode** con theming completo via next-themes.
- **Diseño responsive** optimizado para escritorio y móvil.
- **Row Level Security (RLS)** en todas las tablas para aislamiento entre compañías.
- **Edge Functions** para sincronización, OAuth, proxy y publicación de respuestas en MeLi.
- **Realtime** con Supabase para notificaciones instantáneas de nuevas preguntas.
