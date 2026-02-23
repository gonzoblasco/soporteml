# SoporteML - Gestión de Consultas con IA para Mercado Libre

SoporteML es una plataforma diseñada para automatizar y optimizar la gestión de consultas en Mercado Libre utilizando Inteligencia Artificial. Permite a los vendedores responder más rápido, categorizar preguntas automáticamente y obtener insights detallados sobre sus ventas.

## 🚀 Características Principales

- **Respuestas con IA**: Generación de sugerencias inteligentes basadas en el contexto del producto y la pregunta.
- **Bandeja de Entrada Prioritaria**: Clasificación automática de consultas que requieren atención humana inmediata.
- **Analítica en Tiempo Real**: Dashboards con métricas clave como tiempo de respuesta y categorías más frecuentes.
- **Gestión Multi-tenant**: Soporte para múltiples compañías y roles de usuario (admin/agente).
- **Integración Nativa con MeLi**: Sincronización bidireccional mediante Webhooks y Edge Functions de Supabase.

## 🛠️ Tecnologías

Este proyecto está construido con un stack moderno y escalable:

- **Frontend**: Vite, React 18, TypeScript.
- **UI/UX**: shadcn/ui, Tailwind CSS, Framer Motion, Lucide React.
- **Backend & Database**: Supabase (PostgreSQL, Auth, Edge Functions).
- **Estado & Datos**: TanStack Query (React Query).

## 📁 Estructura del Proyecto

```text
├── src/
│   ├── components/     # Componentes de UI reutilizables
│   ├── contexts/       # Contextos globales (Auth, etc.)
│   ├── hooks/          # Hooks personalizados
│   ├── integrations/   # Configuraciones de servicios externos (Supabase)
│   ├── pages/          # Pantallas principales (Inbox, Analytics, Settings, etc.)
│   └── types/          # Definiciones de tipos TypeScript
├── supabase/
│   ├── functions/      # Edge Functions para integración con Mercado Libre
│   └── migrations/     # Scripts de migración de la base de datos
└── public/             # Activos estáticos
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
   Crea un archivo `.env` en la raíz (basado en `.env.example` si existe) con tus credenciales de Supabase:

   ```env
   VITE_SUPABASE_URL=tu_url_de_supabase
   VITE_SUPABASE_ANON_KEY=tu_clave_anon_de_supabase
   ```

4. **Iniciar servidor de desarrollo**:
   ```sh
   npm run dev
   ```

## 🔐 Base de Datos

El esquema de la base de datos utiliza RLS (Row Level Security) para garantizar la privacidad de los datos entre compañías. Las tablas principales incluyen `companies`, `profiles`, `products` y `questions`.

---

_Desarrollado para optimizar el soporte en el ecosistema de Mercado Libre._
