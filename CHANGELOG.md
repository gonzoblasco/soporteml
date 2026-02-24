# Changelog

Todos los cambios notables de SoporteML se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

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
