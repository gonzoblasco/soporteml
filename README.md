# SoporteML v1.0 — Gestión de Consultas con IA para Mercado Libre

SoporteML es una plataforma especializada para vendedores y equipos de atención en Mercado Libre. Centraliza preguntas, sugiere respuestas con IA, automatiza publicaciones con guardrails y permite operar múltiples empresas desde una sola cuenta.

> **Stack:** Lovable (frontend) · Lovable Cloud (PostgreSQL, Auth, Edge Functions) · Lovable AI (LLM)

---

## 🚀 Funcionalidades

### 📥 Inbox Inteligente

- Bandeja unificada con tabs: **Pendientes**, **Publicadas**, **Auto IA**, **Archivadas**.
- Agrupación automática por comprador + producto con badge de conteo.
- Búsqueda en tiempo real por texto, producto, comprador o categoría IA.
- Navegación por teclado (↑↓) para triage rápido.

### 🚨 Bandeja Prioritaria

- Escalado automático de consultas que requieren atención humana (`needs_human`).
- Separada del inbox general para que nada crítico se pierda.

### 🤖 IA con Contexto de Producto

- **Copiloto**: genera sugerencias basadas en la pregunta + datos del catálogo (si existe).
- **Categorización automática**: Precio, Stock, Técnico, Envío, Garantía.
- **Confidence scoring**: cada respuesta incluye un nivel de confianza (0-1).
- Human-in-the-loop: la IA sugiere, el humano decide.

### ⚡ Autopilot con Guardrails

- Publicación automática de respuestas cuando la confianza supera el umbral configurado.
- Modos independientes: **dentro de horario** y **fuera de horario**.
- Umbral de confianza ajustable por empresa (0.5 – 1.0).
- Failsafe: si la publicación falla, la pregunta pasa a `needs_human`.
- Trazabilidad completa: cada decisión queda registrada en `events`.

### 🏢 Multi-Company & Equipos

- **Múltiples empresas por usuario** con memberships (`active`, `invited`, `disabled`).
- **Company Switcher** en el sidebar para cambiar de tenant al instante.
- **Roles**: admin y agente por empresa, con RLS estricto.
- **Invite flow**: código de invitación por empresa, join desde Settings.
- **1 cuenta de Mercado Libre por empresa** en esta versión.
- Aislamiento total de datos entre empresas (RLS + `company_id` en todas las tablas).

### 📚 Catálogo de Productos

- Split-view CRM: lista con búsqueda/filtros + ficha con tabs (Resumen, Conocimiento IA, Variantes, Políticas, Actividad).
- Asociación automática pregunta ↔ producto por `meli_item_id`.
- Enriquecimiento on-demand desde la API de MeLi con cache.
- Detección de duplicados por título similar, SKU o `meli_item_id`.
- Audit log obligatorio (create / update / archive / restore).

### 🔔 Notificaciones

- Campana in-app con badge de no leídas en tiempo real (Realtime).
- Tipos: `new_question`, `priority_question`, `token_expiring`, `answer_published`.
- Push del navegador (Notification API) + vibración en móviles.
- Toast de bienvenida con conteo de pendientes urgentes.

### 📊 Dashboard & Analytics

- KPIs: respondidas hoy, tiempo promedio de respuesta, pendientes.
- Distribución por categoría IA (pie chart + barras de progreso).
- Ranking Top 5 productos / compradores más consultados.
- Alerta visual de estado del token MeLi (3 niveles de severidad).

### ⚙️ Configuración

- **Perfil**: nombre, contraseña.
- **Mercado Libre**: OAuth connect/disconnect, estado de token, renovación automática.
- **Empresa**: nombre, invite code, miembros del equipo, unirse a otra empresa.
- **IA**: modo (manual / asistido / automático), tono, categorías, instrucciones custom, exclusiones.
- **Autopilot**: toggles dentro/fuera de horario, slider de umbral de confianza.
- **Horario de atención**: configurable por día.
- **Notificaciones push**: toggle por usuario.
- **Plantillas**: biblioteca de respuestas rápidas por empresa y categoría.

### 👑 Panel de Administración (Super Admin)

- **Usuarios**: listado global con memberships múltiples, roles y empresa(s).
- **Empresas**: crear empresa, asignar admin, copiar invite link.
- **Métricas**: totales globales + desglose por empresa (preguntas, respuestas auto/humanas, productos, miembros).

### 🔗 Integración con Mercado Libre

- OAuth flow completo con refresh automático de tokens.
- Sincronización de preguntas via Edge Functions.
- Publicación de respuestas directamente en MeLi.
- Proxy de datos de items para enriquecimiento de catálogo.
- Refresh token protegido contra sobreescritura y race conditions.

### 🌐 Landing Page

- Hero con propuesta de valor, trust badges y stats animados.
- Segmentación por perfil: vendedores de alto volumen, equipos, agencias.
- Mockups interactivos con tabs (Inbox, Analytics, Equipo).
- Sección Autopilot, diferenciadores, FAQ y pricing (Base / Pro).
- Formulario de contacto.

### 🔒 Seguridad & Trazabilidad

- RLS en todas las tablas con aislamiento por `company_id`.
- Memberships como fuente de verdad (funciones SQL `user_belongs_to_company`, `has_membership_role`).
- Tabla `events` (append-only) para audit trail de decisiones de IA, syncs y errores.
- Tabla `audit_logs` para cambios en catálogo de productos.
- Edge Functions autenticadas con validación de permisos.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
|------|-------------|
| **Frontend** | Vite · React 18 · TypeScript |
| **UI/UX** | shadcn/ui · Tailwind CSS · Framer Motion · Lucide React |
| **Backend & DB** | Lovable Cloud (PostgreSQL · Auth · Edge Functions) |
| **Estado** | TanStack Query (React Query) |
| **Realtime** | Supabase Realtime (postgres_changes) |
| **Routing** | React Router v6 |
| **Theming** | next-themes (dark / light) |
| **Pagos** | Stripe (checkout, portal, subscriptions) |

---

## 🗃️ Base de datos

Modelo multi-tenant con `company_id` en todas las tablas operativas:

| Tabla | Propósito |
|-------|-----------|
| `companies` | Empresas registradas (nombre, invite code) |
| `memberships` | Relación usuario ↔ empresa (rol, estado, default) |
| `profiles` | Datos de usuario (nombre, company_id legacy) |
| `user_roles` | Roles globales (legacy, mantenido por compatibilidad) |
| `questions` | Preguntas de MeLi con metadata de IA |
| `products` | Catálogo CRM con knowledge fields |
| `product_variants` | Variantes, atributos y notas por producto |
| `templates` | Plantillas de respuesta por empresa y categoría |
| `company_settings` | Config de IA, autopilot, horarios, feature flags |
| `meli_tokens` | Tokens OAuth de MeLi (1 por empresa) |
| `notifications` | Notificaciones in-app por usuario |
| `events` | Audit trail de decisiones de IA y errores |
| `audit_logs` | Historial de cambios en catálogo |
| `dismissed_meli_questions` | Preguntas descartadas |
| `contact_inquiries` | Formulario de contacto de la landing |

RLS + funciones helper (`get_user_company_id`, `user_belongs_to_company`, `has_membership_role`, `is_super_admin`) para control de acceso.

---

## 📁 Estructura del Proyecto

```text
src/
├── components/
│   ├── ui/                  # Primitivos shadcn/ui
│   ├── landing/             # Hero, MockupTabs, ContactForm, AnimatedCounter
│   ├── catalog/             # ProductList, ProductForm, VariantsTable, AuditTimeline, etc.
│   ├── admin/               # CompaniesTab, MetricsTab
│   ├── CompanySwitcher.tsx  # Selector de empresa activa
│   ├── AICopilotPanel.tsx   # Panel de copiloto IA
│   ├── NotificationBell.tsx # Campana de notificaciones
│   ├── QuestionDetail.tsx   # Detalle de pregunta + respuesta IA
│   └── ...
├── pages/
│   ├── Landing.tsx          # Página pública
│   ├── Login.tsx            # Auth
│   ├── Home.tsx             # Dashboard
│   ├── Inbox.tsx            # Bandeja de preguntas
│   ├── PriorityInbox.tsx    # Bandeja prioritaria
│   ├── CatalogPage.tsx      # Catálogo de productos
│   ├── TemplatesPage.tsx    # Plantillas de respuesta
│   ├── SettingsPage.tsx     # Configuración completa
│   └── AdminPanel.tsx       # Super admin
├── contexts/AuthContext.tsx  # Auth + memberships + currentCompanyId
├── lib/                     # Utilidades (audit, grouping, token health, priority)
└── types/                   # Tipos compartidos

supabase/
├── functions/
│   ├── ai-copilot/          # Sugerencias IA con confidence scoring
│   ├── sync-meli-questions/ # Sync + motor de decisión autopilot
│   ├── publish-meli-answer/ # Publicar respuesta en MeLi
│   ├── meli-oauth-callback/ # OAuth flow
│   ├── meli-item-proxy/     # Proxy de datos de items
│   ├── enrich-product/      # Enriquecimiento de catálogo
│   ├── detect-duplicates/   # Detección de duplicados
│   ├── notify/              # Generación de notificaciones
│   ├── health-check/        # Health check de conectividad
│   ├── create-checkout/     # Stripe checkout
│   ├── customer-portal/     # Stripe portal
│   ├── check-subscription/  # Validación de suscripción
│   └── ...
└── migrations/              # Migraciones SQL
```

---

## ✅ Estado actual — v1.0.1

Primera versión comercial de SoporteML. El producto está operativo con:

- ✅ Multi-company con memberships, switcher y roles
- ✅ Autopilot con guardrails y trazabilidad completa
- ✅ Catálogo de productos con knowledge para IA
- ✅ Panel admin con métricas por empresa
- ✅ Landing page comercial con pricing
- ✅ Integración Stripe (checkout, portal, suscripciones)
- ✅ Notificaciones en tiempo real
- ✅ UX mobile-first con skeleton loaders y transiciones

---

## 🗺️ Roadmap

### v1.1 — Hardening & Estabilidad

- QA end-to-end de flujos críticos (sync → IA → publicación → autopilot).
- Re-scan de seguridad RLS y Edge Functions.
- Estados degradados amables (token expirado, API caída, sync fallido).
- Instrumentación: logs de refresh, fallas de publicación, reintentos.

### v2.0 — CRM de Clientes & Post-venta

Evolucionar SoporteML de "gestor de preguntas" a un **CRM liviano especializado en Mercado Libre**, donde cada interacción tiene contexto completo.

- **Perfil de cliente**: historial de conversaciones, etiquetas internas, notas del equipo. Permite saber quién pregunta recurrentemente, qué compró antes y cómo tratarlo.
- **Órdenes / Post-venta**: vincular consultas con órdenes para resolver reclamos, seguimiento de envíos y devoluciones sin salir de la plataforma.
- **Base de conocimiento transversal**: políticas globales, macros y guías internas que la IA puede usar como contexto (no solo por producto, sino a nivel empresa).
- **Colaboración avanzada**: asignación de preguntas a agentes específicos, comentarios internos, SLAs configurables y permisos más granulares por acción.

### v3.0 — Multi-fuente (más allá de Mercado Libre)

Abrir SoporteML a **otras plataformas de e-commerce**, unificando la atención al cliente en un solo lugar independientemente del canal.

- **Tiendanube, Shopify u otros**: adaptadores por plataforma para ingestar consultas y asociarlas a productos existentes en el catálogo via `source` / `external_id`.
- **UI unificada**: el inbox, la IA y las métricas funcionan igual sin importar el origen. Filtro por canal para operadores que manejan múltiples fuentes.
- **Estrategias de ingesta flexibles**: API/webhooks cuando la plataforma lo permita, fallback por email forwarding cuando no haya API expuesta.
