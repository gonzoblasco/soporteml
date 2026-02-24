# SoporteML v1.0 — Gestión de Consultas con IA para Mercado Libre

SoporteML es una plataforma diseñada para automatizar y optimizar la gestión de consultas en Mercado Libre utilizando Inteligencia Artificial. Permite a los vendedores responder más rápido, categorizar preguntas automáticamente y obtener insights detallados sobre sus ventas.

## 🚀 Características Principales

### 📥 Inbox Inteligente
- **Bandeja unificada** con tabs de estado: Pendientes, Publicadas y Archivadas.
- **Agrupación automática** de preguntas del mismo comprador sobre el mismo producto en filas colapsables con badge de conteo (ej. "3 mensajes pendientes").
- **Búsqueda en tiempo real** por texto de pregunta, producto, comprador o categoría IA.
- **Vista responsive** optimizada para escritorio y móvil con navegación adaptativa.

### 🚨 Bandeja Prioritaria (Priority Inbox)
- **Escalado automático** de consultas que requieren atención humana inmediata.
- Separación clara del flujo normal para no perder preguntas críticas.
- Misma agrupación inteligente por comprador + producto.

### 🤖 Respuestas con IA
- Generación de **sugerencias inteligentes** basadas en el contexto del producto y la pregunta.
- **Categorización automática** de preguntas (Precio, Stock, Técnico, Envío, Garantía).
- Indicación de motivo cuando la IA detecta que se requiere intervención humana.

### 🔔 Notificaciones en Tiempo Real
- **Notificaciones in-app** (toast) con sonido diferenciado para consultas prioritarias vs. normales.
- **Notificaciones push del navegador** (Notification API) que llegan incluso con la pestaña en segundo plano.
- **Vibración** en dispositivos móviles para alertas prioritarias.
- **Toggle configurable** en Settings para activar/desactivar notificaciones push por usuario.

### 📊 Analítica en Tiempo Real
- Dashboards con métricas clave: tiempo de respuesta, categorías más frecuentes, volumen de preguntas.

### ⚙️ Configuración Avanzada (Settings)
- **Perfil de usuario**: nombre y cambio de contraseña.
- **Conexión con Mercado Libre**: OAuth, estado de conexión, desconexión.
- **Gestión de empresa**: nombre, código de invitación, miembros del equipo.
- **Auto-respuesta IA**: modo (manual/asistido/automático), tono, categorías habilitadas, instrucciones personalizadas, reglas de exclusión.
- **Horario de atención** configurable por día.
- **Notificaciones push**: toggle por usuario con feedback de estado de permisos del navegador.

### 👑 Panel de Administración
- Gestión de usuarios y roles (admin/agente) a nivel multi-tenant.

### 🔗 Integración Nativa con Mercado Libre
- Sincronización bidireccional mediante Webhooks y Edge Functions.
- OAuth flow completo para conectar cuentas de vendedor.
- Proxy de items para obtener datos de productos.
- Publicación de respuestas directamente en MeLi.

### 🌐 Landing Page
- Página pública con presentación del producto, contadores animados, mockups interactivos y formulario de contacto.

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
|------|-------------|
| **Frontend** | Vite, React 18, TypeScript |
| **UI/UX** | shadcn/ui, Tailwind CSS, Framer Motion, Lucide React |
| **Backend & DB** | Lovable Cloud (PostgreSQL, Auth, Edge Functions) |
| **Estado & Datos** | TanStack Query (React Query) |
| **Tiempo Real** | Supabase Realtime (postgres_changes) |
| **Routing** | React Router v6 |
| **Theming** | next-themes (dark/light mode) |

## 📁 Estructura del Proyecto

```text
├── src/
│   ├── components/        # Componentes de UI reutilizables
│   │   ├── ui/            # Primitivos shadcn/ui
│   │   ├── landing/       # Componentes de la landing page
│   │   ├── AppSidebar.tsx  # Navegación lateral
│   │   ├── DashboardLayout.tsx  # Layout con notificaciones realtime
│   │   ├── GroupedQuestionCard.tsx  # Tarjeta agrupada colapsable
│   │   ├── QuestionCard.tsx  # Tarjeta individual de pregunta
│   │   ├── QuestionDetail.tsx  # Vista de detalle con respuesta IA
│   │   └── ProductSideCard.tsx  # Info lateral del producto
│   ├── contexts/          # Contextos globales (Auth)
│   ├── hooks/             # Hooks personalizados
│   ├── integrations/      # Configuraciones de servicios externos
│   ├── lib/               # Utilidades (groupQuestions, etc.)
│   ├── pages/             # Pantallas principales
│   │   ├── Inbox.tsx       # Bandeja de entrada principal
│   │   ├── PriorityInbox.tsx  # Bandeja prioritaria
│   │   ├── Analytics.tsx   # Dashboard analítico
│   │   ├── SettingsPage.tsx  # Configuración completa
│   │   ├── AdminPanel.tsx  # Panel de administración
│   │   ├── Landing.tsx     # Página pública
│   │   └── Login.tsx       # Autenticación
│   └── types/             # Definiciones de tipos TypeScript
├── supabase/
│   ├── functions/         # Edge Functions
│   │   ├── sync-meli-questions/   # Sincronización de preguntas
│   │   ├── publish-meli-answer/   # Publicar respuestas en MeLi
│   │   ├── meli-oauth-callback/   # Callback OAuth
│   │   ├── meli-item-proxy/       # Proxy de items
│   │   ├── disconnect-meli/       # Desconexión
│   │   └── debug-meli/            # Debugging
│   └── migrations/        # Scripts de migración SQL
└── public/                # Activos estáticos
```

## ⚙️ Configuración Local

1. **Clonar el repositorio**:
   ```sh
   git clone <URL_DEL_REPO>
   cd soporteml
   ```

2. **Instalar dependencias**:
   ```sh
   npm install
   ```

3. **Configurar variables de entorno**:
   Crea un archivo `.env` en la raíz con tus credenciales:
   ```env
   VITE_SUPABASE_URL=tu_url
   VITE_SUPABASE_ANON_KEY=tu_clave_anon
   ```

4. **Iniciar servidor de desarrollo**:
   ```sh
   npm run dev
   ```

## 🔐 Seguridad

- Row Level Security (RLS) en todas las tablas para aislamiento multi-tenant.
- Autenticación con verificación de email.
- Roles de usuario (admin/agente) con permisos diferenciados.
- Tokens de Mercado Libre almacenados de forma segura con refresh automático.

## 📄 Licencia

Proyecto privado — Todos los derechos reservados.

---

_SoporteML v1.0 — Desarrollado para optimizar el soporte en el ecosistema de Mercado Libre._
