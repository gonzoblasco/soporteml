# Changelog

Todos los cambios notables de SoporteML se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

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
