# SoporteML

SoporteML es una plataforma multiempresa para gestionar preguntas de Mercado Libre con apoyo de IA. Centraliza el inbox, sugiere borradores de respuesta, sincroniza preguntas automáticamente y mantiene aislamiento estricto de datos por empresa.

> Estado actual: integración Mercado Libre operativa, IA operativa, webhook operativo y hardening de seguridad aplicado.

---

## Qué resuelve

Vendedores y equipos que operan en Mercado Libre suelen tener el soporte fragmentado:

- preguntas dispersas
- respuestas inconsistentes
- tiempos lentos
- poca trazabilidad
- dificultad para operar varias empresas o equipos

SoporteML unifica ese flujo en una sola aplicación:

- recibe preguntas
- las organiza
- propone respuestas con IA
- permite publicar o asistir la operación humana
- mantiene contexto por producto, empresa y usuario

---

## Capacidades principales

### Inbox de preguntas

- Bandeja centralizada de consultas
- Estados operativos: pendientes, publicadas, archivadas y variantes según flujo
- Vista orientada a operación diaria

### Copiloto IA

- Genera borradores de respuesta
- Usa contexto del producto y configuración de empresa
- Diseñado para asistir, no para operar a ciegas

### Integración con Mercado Libre

- OAuth funcional
- Estado de conexión visible en la app
- Webhook operativo
- Sincronización automática de preguntas
- Sincronización manual disponible

### Multi-company real

- Un usuario puede pertenecer a múltiples empresas
- Cambio de empresa activa desde la UI
- Aislamiento estricto por `company_id`

### Roles y permisos

- `super admin`
- `admin`
- `agent`

### Catálogo y contexto de producto

- Productos y variantes
- Notas de soporte
- Información útil para enriquecer respuestas de IA

### Admin panel

- Gestión global de empresas
- Gestión de usuarios
- Métricas operativas

---

## Arquitectura

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

### Backend / plataforma

- Supabase
  - PostgreSQL
  - Auth
  - Realtime
  - Edge Functions
  - RLS

### IA

- Edge Function `ai-copilot`
- Integración con gateway/modelo configurado en entorno

### Integración externa

- Mercado Libre
  - OAuth
  - items proxy
  - sync de preguntas
  - webhook

---

## Funciones principales

### Edge Functions relevantes

- `meli-oauth-callback`
- `sync-meli-questions`
- `meli-webhook`
- `meli-item-proxy`
- `ai-copilot`
- `publish-meli-answer`
- `check-subscription`

---

## Modelo de seguridad

SoporteML quedó endurecido con foco en aislamiento multi-tenant y protección de datos sensibles.

### Medidas aplicadas

- RLS por empresa y por usuario
- `super_admins` como fuente de verdad para super admins
- `memberships` endurecido para evitar escalación de roles
- `company_invites` separado de `companies`
- `invite_code` legacy eliminado de `companies`
- `meli_tokens` restringido a lectura server-side
- RPC segura para estado de conexión Mercado Libre
- HIBP / leaked password protection activado

### Decisiones intencionales

- `meli_tokens` no expone tokens OAuth al cliente
- Realtime usa `postgres_changes` con RLS, sin broadcast/presence custom

---

## Tablas principales

- `companies`
- `memberships`
- `profiles`
- `super_admins`
- `company_invites`
- `questions`
- `products`
- `product_variants`
- `company_settings`
- `notifications`
- `events`
- `audit_logs`
- `meli_tokens`

---

## Flujo principal

1. Un admin conecta una cuenta de Mercado Libre
2. Mercado Libre envía eventos al webhook
3. SoporteML sincroniza preguntas
4. El inbox muestra la consulta
5. El Copiloto IA genera un borrador
6. El equipo revisa, ajusta y responde

---

## Estado actual

### Operativo

- Conexión Mercado Libre
- Visualización de estado de conexión
- Webhook de Mercado Libre
- Copiloto IA
- Sync operativa
- Admin panel
- Multi-company
- Hardening principal de seguridad

### Cerrado recientemente

- Fix de conexión OAuth
- Fix de reflejo visual del estado conectado
- Fix de parseo del Copiloto IA
- Creación y validación de `meli-webhook`
- Migración de super admin a tabla dedicada
- Hardening de memberships
- Hardening completo de invite codes
- Activación de leaked password protection

---

## Desarrollo y operación

### Requisitos

- Node.js
- Variables de entorno del frontend
- Proyecto Supabase configurado
- App de Mercado Libre configurada con redirect URI correcta

### Variables / integraciones importantes

- Supabase URL
- Supabase anon key
- App ID de Mercado Libre
- Secret de Mercado Libre
- Secrets de Edge Functions

---

## Notas importantes

- `main` es la rama estable actual
- las ramas de rescue/rollback fueron auxiliares del proceso de recuperación
- el sistema hoy ya no depende de `invite_code` en `companies`
- los tokens de Mercado Libre no deben exponerse al cliente

---

## Próximos pasos naturales

- QA final con usuarios beta
- documentación operativa interna
- mejoras de producto y UX
- nuevas features sobre una base ya estabilizada
