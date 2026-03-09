# SoporteML v1.0 — Gestión de Consultas con IA para Mercado Libre

SoporteML es una plataforma diseñada para automatizar y optimizar la gestión de consultas en Mercado Libre utilizando IA. Permite responder más rápido, categorizar preguntas automáticamente y operar con un “centro de control” claro y confiable.

> **Stack principal:** Lovable (frontend) + **Lovable Cloud** (backend/DB/Auth/Edge Functions) + Lovable AI (LLM).

---

## 🚀 Características Principales

### 📥 Inbox Inteligente

- **Bandeja unificada** con tabs de estado: Pendientes, Publicadas y Archivadas.
- **Agrupación automática** de preguntas del mismo comprador sobre el mismo producto en filas colapsables con badge de conteo (ej. “3 mensajes pendientes”).
- **Búsqueda en tiempo real** por texto de pregunta, producto, comprador o categoría IA.
- **Vista responsive** optimizada para escritorio y móvil con navegación adaptativa.

### 🚨 Bandeja Prioritaria (Priority Inbox)

- **Escalado automático** de consultas que requieren atención humana inmediata.
- Separación clara del flujo normal para no perder preguntas críticas.
- Misma agrupación inteligente por comprador + producto.

### 🤖 Respuestas con IA (Copiloto)

- Generación de **sugerencias** basadas en contexto de la consulta + contexto del producto (si existe).
- **Categorización automática** (Precio, Stock, Técnico, Envío, Garantía, Especificaciones, Características).
- Explica el motivo cuando detecta que requiere intervención humana.
- Human-in-the-loop: la IA sugiere, el humano decide.

### 📚 Catálogo CRM de Productos (para potenciar la IA)

Catálogo interno estilo CRM para que la IA responda con información confiable sin depender de PDFs/Excels.

- Sección en sidebar: **Catálogo** (`/catalog`)
- UI tipo CRM con **split-view**: lista (búsqueda + filtros) + ficha de producto (tabs).
- Ficha del producto con tabs:
  1. **Resumen** (identidad: título, SKU, IDs, enlaces)
  2. **Conocimiento IA** (support_summary, puntos clave, FAQ, do_not_say)
  3. **Variantes** (atributos + notas por variación)
  4. **Políticas** (envíos / devoluciones / garantía “cómo responder”)
  5. **Actividad** (auditoría / historial de cambios)

- **Asociación automática por `meli_item_id`**:
  - Si una consulta trae `meli_item_id` y existe el producto en catálogo, se vincula.
  - Si no existe, se habilita CTA para crear el producto desde el contexto de la consulta.

- **Audit log obligatorio** para cambios (create/update/archive/restore).
- **Preparado para múltiples fuentes** (CRM-ready): `source`, `external_id`, `external_url` (futuro Tiendanube u otras).
- “Shell CRM” listo para expandirse (Clientes / Órdenes / Conocimiento) como **próximamente**.

### 🔔 Centro de Notificaciones

- **Centro de notificaciones in-app** con campana en el sidebar, badge de no leídas en tiempo real y popover con las últimas 20 notificaciones.
- **Generación automática**: Edge Function `notify` crea notificaciones por empresa al detectar preguntas priority o publicar respuestas.
- **Tipos soportados**: `new_question`, `priority_question`, `token_expiring`, `answer_published`.
- **Toast de bienvenida** en el Dashboard con conteo de preguntas urgentes pendientes.
- **Notificaciones push del navegador** (Notification API) y vibración en móviles.
- Toggle configurable en Settings por usuario.

### 📱 UX Mobile & Micro-interacciones

- **Skeleton loaders** en Dashboard, Inbox, Priority Inbox y Catálogo para carga progresiva.
- **Barra de acciones sticky** en detalle de pregunta para mobile (Publicar/Archivar).
- **Swipe gestures** en sidebar mobile (derecha para abrir, izquierda para cerrar).
- **Transiciones de página** con framer-motion entre rutas del dashboard.
- **Keyboard navigation** (↑↓) en listas de preguntas para triage rápido.
- **Empty states mejorados** con animaciones de éxito.

### 📊 Analítica en Tiempo Real

- Dashboards con métricas clave: tiempo de respuesta, categorías más frecuentes, volumen de preguntas.

### ⚙️ Configuración (Settings)

- Perfil de usuario: nombre y cambio de contraseña.
- **Conexión con Mercado Libre**: OAuth, estado de conexión, desconexión.
- Gestión de empresa: nombre, código de invitación, miembros del equipo.
- Auto-respuesta IA: modo (manual/asistido/automático), tono, categorías habilitadas, instrucciones personalizadas, reglas de exclusión.
- Horario de atención configurable por día.
- Notificaciones push: toggle por usuario con feedback de permisos del navegador.

### 👑 Panel de Administración

- Gestión de usuarios y roles (admin/agente) a nivel multi-tenant.

### 🔗 Integración Nativa con Mercado Libre

- Sincronización mediante Webhooks y Edge Functions.
- OAuth flow para conectar cuentas de vendedor.
- Obtención de datos de productos (cuando aplica).
- Publicación de respuestas directamente en MeLi.

---

## 🌐 Landing Page

- Página pública con presentación del producto, mockups y formulario de contacto.

---

## 🛠️ Stack Tecnológico

| Capa               | Tecnologías                                          |
| ------------------ | ---------------------------------------------------- |
| **Frontend**       | Vite, React 18, TypeScript                           |
| **UI/UX**          | shadcn/ui, Tailwind CSS, Framer Motion, Lucide React |
| **Backend & DB**   | **Lovable Cloud** (PostgreSQL, Auth, Edge Functions) |
| **Estado & Datos** | TanStack Query (React Query)                         |
| **Tiempo Real**    | Supabase Realtime (postgres_changes)                 |
| **Routing**        | React Router v6                                      |
| **Theming**        | next-themes (dark/light mode)                        |

---

## 🗃️ Base de datos (Lovable Cloud)

Tablas relevantes (multi-tenant por `company_id`):

- `products` (campos CRM + multi-fuente: `source`, `external_id`, `external_url`, knowledge fields)
- `product_variants` (variantes/atributos/notas por producto)
- `audit_logs` (historial de cambios: actor, acción, before/after)
- (existentes) `questions`, `answers`, `companies`, `memberships`, etc.

Incluye RLS + políticas/controles para mantener los datos aislados por empresa.

---

## 📁 Estructura del Proyecto (alto nivel)

```text
├── src/
│   ├── components/
│   │   ├── ui/                 # Primitivos shadcn/ui
│   │   ├── landing/            # Componentes de landing
│   │   ├── catalog/            # CRM catálogo (lista, ficha, tabs, audit timeline)
│   │   ├── AppSidebar.tsx
│   │   ├── DashboardLayout.tsx
│   │   ├── GroupedQuestionCard.tsx
│   │   ├── QuestionDetail.tsx
│   │   └── ProductSideCard.tsx # puede mostrar knowledge CRM si existe
│   ├── pages/
│   │   ├── Inbox.tsx
│   │   ├── PriorityInbox.tsx
│   │   ├── Analytics.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── AdminPanel.tsx
│   │   ├── Catalog.tsx         # /catalog
│   │   └── Landing.tsx
│   ├── integrations/supabase/
│   ├── hooks/
│   ├── lib/
│   └── types/
├── supabase/
│   ├── functions/              # Edge Functions (copiloto, sync, publish answer, oauth callback, etc.)
│   └── migrations/             # Migraciones: products extendida, product_variants, audit_logs, RLS/triggers
└── CHANGELOG.md
```

---

## ✅ Estado del release

- v1.0 es la primera versión comercial de SoporteML: multi-company, autopilot con guardrails, catálogo CRM, panel admin y landing page comercial.
- Próximos pasos típicos: QA end-to-end, re-scan de seguridad y mejoras de UX/estabilidad.

---

## 🗺️ Roadmap (por versiones)

### v1.1.x — Hardening + Release Quality

- **QA end-to-end** (Inbox → Conversación → Copiloto → Publicación)
  - Casos críticos: múltiples preguntas, producto sin catálogo, token expirado, reconexión, rate limits.
  - Smoke tests sobre Edge Functions clave.

- **Seguridad y aislamiento multi-tenant**
  - Auditoría RLS por tabla (`products`, `questions`, `answers`, `audit_logs`).
  - Revisión de Edge Functions: auth, validación de inputs, logging de acciones sensibles.

- **Confiabilidad operacional**
  - Estados degradados “amables” (token/sync/producto/IA).
  - Instrumentación mínima: logs de refresh, fallas de publicación, reintentos.
  - UX de reconexión: mensajes claros + CTA único (sin confusión).

### v1.2 — Catálogo “menos esfuerzo” + Loop de calidad (IA)

- **Auto-fill del Catálogo** desde el contexto de la consulta
  - Crear producto desde conversación con prefill (título, link, atributos básicos, meli_item_id).
  - Detección de duplicados (match por `meli_item_id`, `sku`, título similar) + merge asistido.

- **Copiloto → Catálogo (feedback loop)**
  - El copiloto sugiere “qué falta” para responder mejor (envío/garantía/variantes).
  - Destacar campos incompletos en la ficha + “completar ahora” sin perder contexto.

- **Métrica interna de completitud**
  - `completeness_score` y “faltan X campos clave” para guiar adopción tipo CRM.

### v1.3 — Enriquecimiento on-demand por API (cache first)

- **Fetch por primer uso** (cachear y no repetir)
  - Si entra un `meli_item_id` no registrado: traer datos por API, normalizar y guardar en Lovable Cloud.
  - TTL / refresh manual para evitar desactualización.

- **Variantes y atributos**
  - Mapping de variaciones a `product_variants`.
  - Estrategia de “diff” para no pisar conocimiento humano (merge inteligente).

- **Resiliencia**
  - Manejo de errores externos (API down/limits) con fallback y reintento.

### v2.0 — CRM real (adopción progresiva)

- **Clientes (CRM)**
  - Perfil del cliente, historial de conversaciones, etiquetas internas, notas.

- **Órdenes / Post-venta**
  - Relación consulta ↔ orden ↔ producto ↔ cliente (cuando aplique).

- **Conocimiento transversal**
  - Base de conocimiento reusable (no solo por producto): políticas globales, macros, guías internas.

- **Colaboración**
  - Asignación, comentarios internos, SLA, roles más finos (audit + permisos por acción).

### v2.1 — Nuevos sources (multi-fuente)

- **Tiendanube u otras plataformas**
  - Adaptadores por plataforma (ingesta de consultas + asociación a productos por `source/external_id`).
  - Unificación de UI y lógica de negocio independientemente del origen.

- **Estrategias de ingesta**
  - API/webhooks cuando existan; fallback por email/forwarding si el canal no está expuesto por API.
