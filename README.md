<p align="center">
  <img src="public/favicon.svg" alt="SoporteML" width="64" />
</p>

<h1 align="center">SoporteML</h1>

<p align="center">
  <strong>Respondé más rápido. Vendé más. Automatizá tu atención en Mercado Libre.</strong>
</p>

<p align="center">
  <a href="https://soporteml.lovable.app">🌐 Sitio web</a> ·
  <a href="#funcionalidades">✨ Funcionalidades</a> ·
  <a href="#planes">💰 Planes</a> ·
  <a href="#stack-tecnológico">🛠️ Stack</a>
</p>

---

## El problema

Cada pregunta sin responder en Mercado Libre es una venta perdida. Los vendedores de alto volumen reciben **cientos de preguntas por día** y no tienen herramientas para gestionarlas eficientemente. El resultado: respuestas lentas, ventas perdidas y reputación dañada.

## La solución

**SoporteML** es la plataforma de gestión de preguntas con IA diseñada exclusivamente para vendedores y equipos de Mercado Libre. Centraliza todas las consultas, sugiere respuestas inteligentes y puede responder automáticamente — todo con guardrails configurables para que mantengas el control.

### ¿Por qué SoporteML?

| Antes | Con SoporteML |
|-------|---------------|
| Respondés manualmente una por una | La IA sugiere respuestas contextuales en un click |
| Fuera de horario = preguntas sin responder | Autopilot responde 24/7 con tus reglas |
| Perdés preguntas críticas en el ruido | Bandeja prioritaria escala lo urgente automáticamente |
| Cada vendedor usa su propia cuenta | Multi-empresa: todas las operaciones en un solo lugar |
| Sin visibilidad del rendimiento | Dashboard con métricas en tiempo real |

---

## Funcionalidades

### 📥 Inbox inteligente
Bandeja unificada con todas las preguntas de tus publicaciones. Filtrá por estado, categoría IA, producto o comprador. Agrupación automática por conversación y navegación por teclado para triage rápido.

### 🤖 Respuestas con IA
La IA analiza cada pregunta junto con el contexto del producto (puntos clave, FAQ, políticas) y sugiere la mejor respuesta. Vos aprobás, editás o descartás. **Human-in-the-loop** por defecto.

### ⚡ Autopilot con guardrails
Configurá la IA para que responda automáticamente cuando la confianza supere tu umbral. Modos independientes para dentro y fuera de horario. Si algo no cuadra, la pregunta se escala a un humano. Trazabilidad completa de cada decisión.

### 🚨 Bandeja prioritaria
Las preguntas que requieren atención humana se detectan y separan automáticamente. Nunca más pierdas una venta por no ver una consulta urgente.

### 📚 Base de conocimiento
Cargá políticas, restricciones y FAQ a nivel global o por categoría de producto. La IA los usa como contexto para generar respuestas más precisas y alineadas con tu negocio.

### 📦 Catálogo inteligente
CRM de productos con ficha completa: puntos clave, notas de envío/garantía/devolución, variantes y "qué no decir". Enriquecimiento automático desde la API de Mercado Libre.

### 🏢 Multi-empresa y equipos
Gestioná múltiples empresas desde una sola cuenta. Invitá a tu equipo con roles (admin, agente) y código de invitación. Aislamiento total de datos entre empresas. **Ideal para agencias.**

### 📊 Dashboard y analytics
KPIs en tiempo real: preguntas respondidas, tiempo promedio, pendientes. Distribución por categoría, ranking de productos más consultados y estado de la conexión con Mercado Libre.

### 🔔 Notificaciones inteligentes
Alertas in-app y push del navegador para preguntas nuevas, urgentes, respuestas publicadas y estado del token. Badge con conteo en tiempo real.

### 📝 Plantillas de respuesta
Biblioteca de respuestas rápidas organizadas por categoría. Insertá plantillas con un click y personalizá con variables.

### 🔗 Integración nativa con Mercado Libre
OAuth completo, sincronización automática de preguntas, publicación directa de respuestas y renovación automática de tokens. Plug & play.

---

## ¿Para quién es SoporteML?

| Perfil | Caso de uso |
|--------|-------------|
| **Vendedores de alto volumen** | +50 preguntas/día que no podés responder a tiempo |
| **Equipos de soporte** | Varios agentes respondiendo sin pisar respuestas ni perder contexto |
| **Agencias y operadores** | Múltiples cuentas de MeLi gestionadas desde un solo dashboard |

---

## Planes

| | **Base** | **Pro** |
|---|----------|---------|
| Precio | **$100/mes** | **$200/mes** |
| Inbox unificado | ✅ | ✅ |
| IA sugerencias | ✅ | ✅ |
| Catálogo inteligente | ✅ | ✅ |
| Base de conocimiento | ✅ | ✅ |
| Plantillas | ✅ | ✅ |
| Dashboard | ✅ | ✅ |
| Autopilot 24/7 | — | ✅ |
| Multi-empresa | — | ✅ |
| Soporte prioritario | — | ✅ |

---

## Stack tecnológico

| Capa | Tecnologías |
|------|-------------|
| **Frontend** | React · TypeScript · Vite · Tailwind CSS · shadcn/ui · Framer Motion |
| **Backend** | Lovable Cloud (PostgreSQL · Auth · Edge Functions · Realtime) |
| **Estado** | TanStack Query |
| **IA** | Lovable AI (modelos Gemini y GPT) |
| **Pagos** | Stripe |

---

## Arquitectura

```
┌─────────────────────────────────────────────┐
│                  Frontend                    │
│   React + TanStack Query + React Router      │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │    Lovable Cloud     │
        │                      │
        │  ┌────────────────┐  │
        │  │   PostgreSQL   │  │
        │  │  (multi-tenant │  │
        │  │   con RLS)     │  │
        │  └────────────────┘  │
        │                      │
        │  ┌────────────────┐  │
        │  │ Edge Functions │  │
        │  │  AI · Sync ·   │  │
        │  │  OAuth · Pay   │  │
        │  └────────────────┘  │
        │                      │
        │  ┌────────────────┐  │
        │  │   Realtime     │  │
        │  └────────────────┘  │
        └──────────┬──────────┘
                   │
        ┌──────────┴──────────┐
        │   Mercado Libre API  │
        │   Stripe · Lovable AI│
        └─────────────────────┘
```

---

## Seguridad

- **Row Level Security (RLS)** en todas las tablas con aislamiento por empresa
- **Memberships** como fuente de verdad para control de acceso
- **Audit trail** completo: cada decisión de IA, sync y error queda registrado
- **Tokens protegidos** contra race conditions y sobreescritura
- **Edge Functions autenticadas** con validación de permisos

---

## Estado actual — v1.3.1

Producto operativo con:

- ✅ Multi-empresa con roles, memberships y company switcher
- ✅ Autopilot con guardrails, trazabilidad y failsafe
- ✅ Base de conocimiento global y por categoría con inyección en IA
- ✅ Sugerencias proactivas de gaps de conocimiento en el copiloto
- ✅ Catálogo CRM con enriquecimiento desde MeLi
- ✅ Dashboard con métricas en tiempo real
- ✅ Notificaciones push + in-app
- ✅ Integración Stripe (checkout, portal, suscripciones)

---

## Licencia

Software propietario. Todos los derechos reservados.

---

<p align="center">
  <strong>¿Listo para dejar de perder ventas?</strong><br>
  <a href="https://soporteml.lovable.app">Empezá gratis →</a>
</p>
