# SoporteML v1.1 — Gestión de Consultas con IA para Mercado Libre

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

### 🔔 Notificaciones en Tiempo Real

- **Notificaciones in-app** (toast) con sonido diferenciado para consultas prioritarias vs. normales.
- **Notificaciones push del navegador** (Notification API).
- **Vibración** en dispositivos móviles para alertas prioritarias.
- Toggle configurable en Settings por usuario.

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
