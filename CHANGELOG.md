# Changelog
## [Unreleased]

### Added
- **Docs: MERCADOLIBRE_INTEGRATION.md** — Documentación técnica exhaustiva de la integración con MercadoLibre: arquitectura, OAuth PKCE, pipeline de ingesta, motor de decisión autopilot, detalle de cada edge function, variables de entorno, y guía de testing local.
- **Dashboard: Métricas del Copiloto IA** — Nueva card en Home con 4 KPIs (generaciones IA, auto-publicadas, confianza promedio, tasa de automatización) y barra visual IA vs Humano.
- **Dashboard: Filtro por rango de fechas** — Selector 7d / 30d / 90d / Todo que filtra todas las métricas, gráficos y rankings del dashboard.

### Fixed
- **MercadoLibre: disconnect-meli deployado** — La edge function no estaba deployada, causando error al desconectar. Re-deployada correctamente.
- **MercadoLibre: errores detallados** — Los botones "Desconectar" y "Forzar sincronización" ahora muestran el mensaje de error real del backend en lugar de un genérico.


- **AI Gateway migration**: All edge functions (`ai-copilot`, `ai-service`, `backfill-ai-answers`, `enrich-product`) now fallback to `LOVABLE_API_KEY` when `AI_API_KEY` is not set, and use the Lovable AI Gateway (`ai.gateway.lovable.dev`) with model `google/gemini-3-flash-preview` as default instead of OpenAI.
- **Supabase client resilience**: Created `src/lib/supabase-init.ts` wrapper with hardcoded production fallbacks to prevent `supabaseUrl is required` crash on stale CDN/SW bundles. All 41 files updated to import from wrapper.
- Service Worker: switched navigation requests to network-first strategy to prevent stale bundles after deploy
- Bumped SW cache version to `soporteml-v2` to invalidate old cached assets

### Security
- **CRITICAL**: Removed permissive SELECT policy on `meli_tokens` that exposed raw OAuth `access_token`/`refresh_token` to all company members. Client reads now routed through `meli_connection_status` view only.
- **CRITICAL**: Restricted DELETE policy on `meli_tokens` from `public` to `authenticated` role to prevent unauthenticated evaluation.
- **audit-log edge function**: Added company membership verification before inserting audit entries, preventing cross-company audit trail pollution.
- **MeLi API error responses**: `publish-meli-answer` and `enrich-product` now return generic error messages instead of raw MercadoLibre API error bodies.
- **memberships RLS**: Added admin-scoped INSERT/UPDATE/DELETE policies so company admins can manage their own team members.

### Security (previous)
- **CRITICAL**: `backfill-ai-answers` Edge Function now enforces super admin check (was fetched but never guarded). Uses `anonClient.rpc("is_super_admin")` with 403 response on failure.
- **CRITICAL**: Fixed privilege escalation on `user_roles` table — replaced recursive `Admins can manage roles` RLS policy (which allowed any admin to grant roles to anyone) with `Super admin can manage roles` restricted to `is_super_admin()` only.


Todos los cambios notables de SoporteML se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.4.1] — 2026-03-17

### Fixed
- Edge Functions: reemplazados todos los imports `npm:@supabase/supabase-js@2.57.2` por `https://esm.sh/@supabase/supabase-js@2` (4 funciones: admin-create-user, create-checkout, customer-portal, check-subscription).
- Edge Functions: casteados todos los `catch(error)` de tipo `unknown` con `error instanceof Error ? error.message : String(error)` (8 funciones).
- Tests: corregidos mocks de `QuestionRow` con todas las propiedades requeridas en AICopilotPanel.test y QuestionCard.test.
- Tests: corregido import path de `QuestionRow` en groupQuestions.test.
- Tests: corregido action type inválido `"delete"` → `"archive"` en auditLog.test.
- Declaración de tipo `Deno` en `_shared/ai-service.ts` para compatibilidad con TypeScript de Vite.

## [1.4.0] — 2026-03-15

### Added
- Paginación server-side en Inbox y Catálogo (50 registros por página) para soportar más de 1000 registros.
- Componente reutilizable `PaginationBar` y hook `usePagination`.
- Contador total real desde la base de datos en ambas vistas.

## [1.3.2] — 2026-03-14

### Fixed
- Migrados `OnboardingWizard` y `QuestionDetail` de `companyId` (deprecado) a `currentCompanyId` para alinearse con la arquitectura multi-tenant actual.

### Changed
- Refactorizado `SettingsPage.tsx` (1496 líneas) en 10 sub-componentes independientes bajo `src/components/settings/`: ProfileSection, JoinCompanySection, CompanySection, MeliConnectionSection, TeamSection, AiConfigSection, AutoReplySection, TrashSection, NotificationsSection, BillingSection.

---


## [1.3.1] — 2026-03-12

### Changed
- README reescrito con enfoque marketing: problema/solución, tabla comparativa, planes, arquitectura visual y CTAs

### Added
- Sugerencias de conocimiento por categoría MeLi: si un producto tiene categoría y no hay entries específicas, sugiere crearlas
- Combinación inteligente de sugerencias globales + categoría (max 2 totales)

---

## [1.3.0] — 2026-03-12

### Added
- Sugerencias proactivas de conocimiento en el Copiloto IA: detecta gaps globales (política, restricción, FAQ) y sugiere crearlos
- Anti-spam por sesión: cada tipo de sugerencia se muestra solo una vez por sesión
- Link directo a /knowledge desde las sugerencias



## [1.2.0] — 2026-03-12

### Agregado — Conocimiento Fase 2: Scope Categoría

- **Scope `categoria`**: artículos de conocimiento ahora pueden aplicarse a una categoría MeLi específica además de globalmente. Selector de categoría poblado automáticamente desde productos sincronizados.
- **Trigger de consistencia en DB**: `scope = 'global'` fuerza `scope_ref = NULL`; `scope = 'categoria'` requiere `scope_ref NOT NULL`.
- **Inyección IA priorizada**: el prompt de IA ahora ordena restricciones primero (categoría → global), luego conocimiento de categoría, luego global. Cada bloque por `priority DESC`.
- **Filtro por alcance en UI**: nuevo dropdown en la lista para filtrar artículos por Global / Categoría.
- **UI defensiva**: si no hay categorías detectadas en productos sincronizados, se muestra mensaje claro y se deshabilita el scope `categoria`.

---

## [1.1.0] — 2026-03-12

### Agregado — Módulo Conocimiento v1

- **Nueva sección CRM "Conocimiento"** (`/knowledge`): base de conocimiento del negocio con artículos de tipo Política, FAQ, Guía y Restricción. Scope v1: solo global (aplica a toda la empresa).
- **Split-view UI**: lista con búsqueda y filtro por tipo + editor con título, contenido (max 2000 chars), prioridad (0-10), toggles de visibilidad IA y estado activo. Mobile: navegación lista → editor fullscreen.
- **Inyección en IA**: las entries activas y visibles se inyectan automáticamente en el system prompt del Copiloto IA y del Sync de preguntas, separando conocimiento afirmativo (`--- CONOCIMIENTO DEL NEGOCIO ---`) de restricciones (`--- RESTRICCIONES (NO PROMETER / NO AFIRMAR) ---`). Ordenadas por prioridad DESC con truncación a ~4000 chars.
- **Tabla `knowledge_entries`** con RLS completa: members pueden ver, admin/agent pueden crear/editar, solo admin puede eliminar.
- **Sidebar CRM**: link "Conocimiento" habilitado con ícono BookOpen.

---

## [1.0.8] — 2026-03-12

### Mejorado — EPIC Responsive Design & Mobile UX
- **Admin Panel**: Tabs responsive con texto abreviado en móvil; tablas de Métricas, Companies y Consultas convertidas a cards en pantallas <640px con scroll horizontal en desktop.
- **Admin Users**: Memberships con chips y popovers ya funcionan correctamente en mobile.
- **Settings**: Layout de grid adaptado; sección MeLi con descripción oculta en mobile para evitar overflow; botones de acciones con flex-wrap correcto.
- **Landing**: Botón "Empezar" visible en todas las pantallas (antes oculto en mobile con `hidden sm:inline-flex`).
- **Home/Dashboard**: Padding reducido en mobile (p-4 vs p-6), espaciado más compacto.
- **Plantillas**: Header y filtros apilados verticalmente en mobile; botón "Nueva plantilla" ocupa ancho completo.
- **Catálogo ProductForm**: Tabs scrollables horizontalmente en mobile con texto más pequeño.
- **QuestionDetail**: Padding reducido en mobile; botones de acción con `size="sm"` consistente; "Guardar como plantilla" abreviado.
- **Inbox y Priority**: Layout ya era correcto (detalle full-screen en mobile) — sin cambios necesarios.
- **Login/Signup/Onboarding**: Ya eran responsive — sin cambios necesarios.

---

## [1.0.7] — 2026-03-12

### Corregido
- **CRM en system prompt (causa raíz)**: El contexto CRM (resumen, puntos clave, FAQ, políticas, variantes) ahora se inyecta en el **system prompt** durante el sync — igual que hace el Copiloto IA. Antes iba en el user prompt, donde el modelo lo trataba como contexto secundario.
- **Formato CRM unificado**: `fetchCrmContext` ahora usa headers idénticos al Copiloto (`--- CONOCIMIENTO CRM DEL PRODUCTO ---`, `• bullets`, `⚠️ NO PROMETER`).
- **Descripción de MeLi incluida**: El sync ahora busca la descripción del producto (desde `meli_cache` o API `/items/{id}/description`) y la incluye en el contexto.
- **Guard CRM del Copiloto corregido**: `ai-copilot` ya no ignora campos CRM cuando falta `support_summary` — ahora incluye key_points, FAQ, etc. aunque no haya resumen.

### Agregado
- **Backfill masivo** (`backfill-ai-answers`): Nueva edge function que regenera `ai_suggested_answer` para preguntas pendientes usando la lógica unificada con CRM completo.

---

## [1.0.6] — 2026-03-12

### Corregido
- **Generación IA unificada en ingesta**: `sync-meli-questions` ahora usa la misma calidad de prompt, modelo (`gemini-3-flash-preview`), temperatura (0.4) y contexto estructurado que el Copiloto IA. Incluye buyer_nickname, product_price, y el contexto CRM completo como campos explícitos en el prompt.
- **Modelo actualizado**: La generación en ingesta pasó de `gemini-2.5-flash` a `gemini-3-flash-preview` para igualar la calidad del copiloto manual.
- **Prompt mejorado**: El prompt de ingesta ahora usa español rioplatense, estructura de copiloto, e instrucciones refinadas — eliminando la diferencia de calidad entre respuesta de sync y respuesta manual.
- **UI respeta respuesta de ingesta**: `AICopilotPanel` no auto-genera si ya existe `ai_suggested_answer` de alta calidad generada durante el sync. El copiloto sigue disponible para regenerar manualmente.

---

## [1.0.5] — 2026-03-12

### Corregido
- **Contexto CRM en ingesta**: `sync-meli-questions` ahora enriquece el contexto del producto con datos CRM (`support_summary`, `key_points`, `faq_bullets`, `do_not_say`, `shipping_notes`, `returns_notes`, `warranty_notes`) y variantes del catálogo interno antes de generar la respuesta IA. Esto unifica la calidad entre la respuesta de ingesta y la del copiloto.
- **Auto-respuesta con placeholder**: Autopilot ahora publica respuestas generadas con contexto CRM completo en lugar de respuestas genéricas sin datos del producto.
- **Copilot no sobrescribe respuesta de ingesta**: Si `ai_suggested_answer` ya fue generada durante el sync, el Copiloto IA ya no auto-dispara una nueva generación al abrir la consulta. El textarea muestra la respuesta de ingesta directamente. El copiloto sigue disponible para regenerar manualmente.

---

## [1.0.4] — 2026-03-11

### Corregido
- **RLS meli_tokens**: Usuarios no-super-admin ahora pueden ver el estado de conexión de MercadoLibre de su propia empresa (nueva política SELECT por membership).
- **Sync manual multi-company**: `sync-meli-questions` ahora recibe `company_id` explícito del frontend, validando pertenencia antes de sincronizar. El cron sigue operando sin cambios.
- **Disconnect multi-company**: `disconnect-meli` reemplazó `has_role` (legacy) por `has_membership_role` y ahora recibe `company_id` explícito para desconectar la empresa activa correcta.
- **Frontend Settings**: `SyncButton` y `handleDisconnect` envían `currentCompanyId` en el body de la invocación.

---

## [1.0.3] — 2026-03-10

### Corregido
- **Bug multi-company**: Inbox y Priority Inbox ahora se actualizan en tiempo real cuando llegan nuevas consultas (suscripción realtime por company).
- **Bug multi-company**: Los toasts de notificación solo se muestran para consultas de la compañía activa del usuario.
- **Bug multi-company**: El estado de conexión de MercadoLibre ahora filtra por la compañía activa y se actualiza al cambiar de empresa.



## [1.0.2] — 2026-03-10

### 🛡️ Admin — Crear usuarios

#### Agregado

- **Botón "Crear usuario"** en Admin > Usuarios que abre un dialog con formulario completo (nombre, email, contraseña, empresa, rol, plan).
- **Edge Function `admin-create-user`** — crea usuario con email auto-confirmado, asigna membresía a empresa y opcionalmente crea suscripción Stripe (Plan Base $100/mes).
- **Selector de plan** — Plan Base habilitado; Plan Pro visible pero deshabilitado con badge "Próximamente".

---

## [1.0.1] — 2026-03-09

### 🌐 Landing page — Reescritura comercial

#### Cambiado

- **Hero** — nuevo título enfocado en el pain point real ("respondé en segundos, no en horas"). CTA corregido de "Empezar gratis" (inconsistente con pricing) a "Probar SoporteML".
- **Trust badges** — nueva fila bajo el hero con indicadores de confianza: conexión oficial, multi-usuario, métricas en tiempo real.
- **Stats** — reemplazado "50+ vendedores" por "80% ahorro de tiempo", dato más comunicable.
- **Sección "Para quién es"** — nueva sección que segmenta explícitamente: vendedores de alto volumen, equipos de atención, y agencias/operadores.
- **Features** — ampliado de 6 a 8 features (agrega: Equipos y roles, Multi-empresa, Catálogo inteligente). Incorpora tags de categoría por feature.
- **MockupTabs** — añadida nueva pestaña "Equipo" que muestra el sistema de roles, estados online/offline y código de invitación. Pestaña analytics incorpora métrica de Autopilot y empresa activa.
- **Sección Autopilot** — nueva sección destacada que explica y muestra visualmente el autopilot con guardrails.
- **Sección "¿Por qué SoporteML?"** — nueva sección de diferenciadores: especialización en MeLi, IA con contexto de producto, control total, multi-tenant real.
- **FAQ** — nueva sección con 4 preguntas frecuentes clave (cuentas MeLi, capacidades IA, usuarios, cancelación).
- **Pricing** — plan Base ahora con badge "Recomendado"; plan Pro sin badge de primary (era confuso). CTA de Pro cambiado a "Reservar acceso".
- **Navbar** — agrega botón "Empezar" junto a "Ingresar" para mejorar conversión. Enlace FAQ en menú.
- **Footer** — actualizado con logo y enlace a FAQ.

---

## [1.0.0] — 2026-03-09

### 🏢 Multi-Company — Cierre del Epic (Hitos 1-6)

#### Cambiado

- **Frontend migrado completamente a `currentCompanyId`** — todos los componentes (incluyendo `TemplatePicker`, `AICopilotPanel`, y secciones internas de `SettingsPage`: `AiConfigSection`, `TrashSection`) ahora usan `currentCompanyId` en vez del alias legacy `companyId`.
- **Backend migrado a memberships** — funciones admin (`get_admin_users`, `get_admin_company_metrics`) ahora leen desde `memberships` en vez de `profiles.company_id`.
  - `get_admin_users()`: devuelve campo `memberships` (JSONB array) con todas las companies del usuario, manteniendo `company_id` y `role` legacy para compatibilidad.
  - `get_admin_company_metrics()`: cuenta miembros usando `COUNT(DISTINCT user_id)` desde `memberships` activas, corrigiendo conteo para usuarios multi-company.
- **`companyId` oficialmente deprecated** — alias legacy en `AuthContext` será removido en v1.1.0.

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

## [0.9.0] — 2026-03-09

### 🏢 Multi-Company — Hito 5: Admin & Invites

#### Añadido

- **Funciones RPC de membership management**: `add_company_membership`, `remove_company_membership`, `update_membership_role`, `get_company_members`, `join_company_by_invite` — administración completa de memberships con validación de permisos (admin o super admin).
- **AdminPanel Users tab**: rediseñado para mostrar memberships múltiples por usuario. Cada usuario ahora puede tener badges clickeables con todas sus companies.
- **Settings > Join Company**: nueva sección para que usuarios se unan a empresas adicionales vía invite code. Si es la primera membership, se marca automáticamente como default.
- **`refreshMemberships()` en AuthContext**: permite refrescar lista de companies del usuario sin hacer logout/login completo.

#### Cambiado

- **Team Section en Settings**: scope estricto a `currentCompanyId` usando `get_company_members()` RPC. Solo muestra miembros de la empresa activa.
- **CompaniesTab en AdminPanel**: asignación de admin inicial al crear company usa `add_company_membership` en vez de manipular `profiles` directamente.
- **`handle_new_user()`**: actualizado para crear membership automáticamente al registrarse (empresa nueva o por invite code), cerrando gap donde usuarios quedaban sin membership.

---

## [0.8.0] — 2026-03-09

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

## [0.7.0] — 2026-03-09

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

## [0.6.0] — 2026-03-09

### 🔒 Multi-Company — Hito 3: Backend de Seguridad — Memberships como Fuente de Verdad

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

## [0.5.0] — 2026-03-08

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

## [0.4.4] — 2026-03-08

### Cambiado
- Onboarding solo se muestra para admins nuevos en su empresa (primera vez). Super Admin lo saltea automáticamente.

## [0.4.3] — 2026-03-08

### ✨ Mejoras

- **Admin: creación de empresa con asignación de usuario** — Al crear una empresa desde `/admin` → Companies, ahora se puede asignar un usuario existente (sin empresa) como admin inicial. Si no se asigna, se muestra prominentemente el invite code y link de invitación. Badge "Sin usuarios" en empresas vacías. Botón de copiar link de invitación en cada fila.

---

## [0.4.2] — 2026-03-08

### ✨ Mejoras

- **Panel Admin: nueva pestaña Métricas** — Dashboard con totales globales (preguntas, respuestas automáticas/humanas, productos) y tabla de uso desglosado por empresa. Usa RPC `get_admin_company_metrics` con `SECURITY DEFINER` y validación de super admin.

---

## [0.4.1] — 2026-03-07

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

## [0.4.0] — 2026-03-06

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

## [0.3.0] — 2026-03-05

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

## [0.2.0] — 2026-03-05

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

## [0.1.0] — 2026-02-26

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

## [0.0.1] — 2026-02-24

### 🎉 Release Inicial

Primera versión de SoporteML — plataforma de gestión de consultas con IA para vendedores de Mercado Libre.

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
