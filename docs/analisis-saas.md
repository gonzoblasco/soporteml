# Análisis Detallado en SaaS Multi-Tenant

## 📊 **ANÁLISIS GENERAL DE LA ARQUITECTURA**<!-- {"fold":true} -->

### **SoporteML: Gestor de Consultas Multi-Tenant con IA para Mercado Libre**

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SOPORTEML ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  FRONTEND (React 18 + TypeScript + Vite)                            │
│  ├── Pages: Login, Landing, Inbox, PriorityInbox, Home              │
│  ├── Settings, Catalog, Knowledge, Admin Panel, Templates           │
│  ├── Components: UI (Radix), Forms (React Hook Form), Charts        │
│  └── State: React Query + Contexts (Auth, multi-tenant awareness)   │
│                                                                       │
│  BACKEND (Supabase)                                                  │
│  ├── Authentication: Supabase Auth (Email/Password + SSO ready)     │
│  ├── Database: PostgreSQL with RLS (Row-Level Security)            │
│  ├── Edge Functions: AI Copilot, integrations                      │
│  ├── Realtime: Subscriptions for live updates                      │
│  └── Storage: File uploads for catalogs                             │
│                                                                       │
│  INTEGRATIONS                                                        │
│  ├── Mercado Libre API: OAuth, sync questions, post answers         │
│  ├── AI: Claude/OpenAI for copilot suggestions                      │
│  └── Webhooks: Real-time question ingestion                         │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ **MODELO DE DATOS (Multi-Tenant)**

```typescript
// Core Multi-Tenant Entities:

1. COMPANIES (Tenant)
   ├── company_id (PK)
   ├── name, owner_id, status
   ├── meli_seller_id (integración MeLi)
   └── settings: AI tone, confidence thresholds, schedules

2. USERS (con RBAC)
   ├── user_id
   ├── company_id (FK - multi-company support)
   ├── role: admin | agent | viewer
   ├── email, full_name
   └── RLS: Solo acceso a datos de su company_id

3. PRODUCTS (Catálogo)
   ├── product_id
   ├── company_id (FK)
   ├── title, meli_item_id, price
   ├── key_points[], faq_bullets[], do_not_say[]
   ├── shipping_notes, warranty_notes
   └── meli_category_name (para scope contextual)

4. QUESTIONS (Core del negocio)
   ├── id, company_id (FK), product_id (FK)
   ├── meli_question_id (unique per company)
   ├── buyer_id, buyer_nickname, question_text
   ├── status: pending | published | archived | auto_published | needs_human
   ├── AI fields:
   │   ├── ai_category: Precio | Stock | Técnico | Envío | Garantía
   │   ├── ai_suggested_answer
   │   ├── ai_confidence (0-1)
   │   └── ai_decision_reason
   ├── answered_by_ai (boolean)
   ├── final_answer, answered_by, answered_at
   ├── requires_human (flag para priority inbox)
   ├── requires_human_reason
   ├── meli_status, meli_permalink
   └── Realtime: trigger en cambios para actualizar UI

5. KNOWLEDGE_ENTRIES (IA Context)
   ├── id, company_id (FK)
   ├── title, content, type: política | faq | guía | restricción
   ├── scope: 'global' | 'categoria'
   ├── scope_ref: category_id (si scope = categoria)
   ├── ai_visible (inyectable al copiloto)
   ├── priority (orden para injection)
   └── is_active

6. MELI_CONNECTION_STATUS (Auth + Health)
   ├── company_id (FK, unique)
   ├── access_token (encrypted)
   ├── refresh_token (encrypted)
   ├── expires_at (para renovación automática)
   └── has_refresh_token (para warnings UI)
```

---

## 🎯 **FLUJO DE CONSULTAS (Core Flow)**

```
USER → MERCADO LIBRE API (Webhook)
    ↓
    └─→ [INGESTA] Store Question + fetch product context
        ↓
        ├─→ Extract: buyer, category (Precio/Stock/Técnico), product
        ├─→ Fetch product context (key_points, FAQ)
        └─→ Store with status: "pending"

    ↓
    ├─→ [AI COPILOT] User clicks "Get AI suggestion"
    │   ├─→ Fetch question + product context + knowledge entries (global + category)
    │   ├─→ Call Edge Function 'ai-copilot' (Claude)
    │   ├─→ Return: { summary, draft, missing_data, crm_suggestions, knowledge_suggestions }
    │   └─→ Display suggestion in UI
    │
    └─→ [AUTOPILOT] Scheduled check (if enabled in company settings)
        ├─→ Fetch all pending questions where confidence > threshold
        ├─→ Auto-generate answers via copilot
        ├─→ Post answers to MeLi if status='auto_published'
        ├─→ Mark as 'auto_published' (with audit trail)
        └─→ If confidence low → mark requires_human=true

HUMAN REVIEW (Priority Inbox)
├─→ Agent reviews human-flagged questions
├─→ Approves/edits AI suggestion
├─→ Publishes answer (manual or auto-post to MeLi)
└─→ Mark as 'published'
```

---

## 🔐 **Seguridad Multi-Tenant (RLS Strategy)**

```sql
-- ISOLAMENTO PERFECTO POR COMPANY:

1. Row-Level Security (RLS) activado en:
   - questions
   - products
   - knowledge_entries
   - meli_connection_status
   - users (dentro de company)

2. Policy Pattern:
   SELECT: WHERE company_id = auth.user().company_id
   UPDATE/DELETE: Same + additional ownership checks

3. User-Company Association:
   - JOIN users_companies (user_id, company_id, role)
   - user.company_id = FK a users_companies
   - currentCompanyId en contexto React (para cambiar entre empresas)

4. Multi-Company Logic:
   - User puede tener múltiples companies
   - SELECT current_company from auth context
   - All queries filtered by currentCompanyId
```

---

## 💡 **Características de SaaS Implementadas**

### ✅ **Multi-Tenancy**

- ✓ Company isolation (RLS)
- ✓ Soft multi-account (1 usuario → N empresas)
- ✓ Team collaboration (roles: admin, agent, viewer)
- ✓ Invite codes para agregar usuarios

### ✅ **IA + Automatización**

- ✓ Copiloto contextual (product metadata + knowledge base)
- ✓ Sugerencias de respuesta (AI confidence scoring)
- ✓ Autopilot con guardrails (thresholds + schedules)
- ✓ Respuestas 24/7 fuera de horario
- ✓ Knowledge base injectable (global + category-scoped)

### ✅ **Integración Mercado Libre**

- ✓ OAuth 2.0
- ✓ Sync de preguntas via webhooks/API
- ✓ Auto-posting de respuestas
- ✓ Token refresh automático
- ✓ Health check (expiration alerts)

### ✅ **Analytics & Monitoring**

- ✓ Dashboard: KPIs, distribución por categoría
- ✓ Métricas por agente (answered by user)
- ✓ Ranking: productos y compradores frecuentes
- ✓ Real-time updates via Supabase Realtime

### ✅ **UX Avanzada**

- ✓ Inbox inteligente con tabs (Pendientes, Publicadas, Auto IA, Archivadas)
- ✓ Priority Inbox (preguntas que necesitan humano)
- ✓ Search + filters (status, category, product)
- ✓ Paginación server-side (50 registros por página para scale)
- ✓ Mobile-responsive (hooks: useIsMobile)
- ✓ Dark/Light mode (next-themes)
- ✓ Sugerencias proactivas (gap detection en knowledge base)

---

## 📁 **Estructura del Proyecto**

```
src/
├── pages/
│   ├── Inbox.tsx              [Bandeja principal]
│   ├── PriorityInbox.tsx      [Preguntas human-required]
│   ├── Home.tsx               [Dashboard con KPIs]
│   ├── CatalogPage.tsx        [Gestor de productos]
│   ├── KnowledgePage.tsx      [Base de conocimiento IA]
│   ├── SettingsPage.tsx       [10 sub-componentes modulares]
│   ├── AdminPanel.tsx         [Super-admin: users, companies, metrics]
│   ├── Login.tsx              [Auth: login/signup/join]
│   └── Landing.tsx            [Marketing]
│
├── components/
│   ├── QuestionDetail.tsx     [Viewer + editor de respuestas]
│   ├── GroupedQuestionCard.tsx [Agrupa por conversación]
│   ├── DashboardLayout.tsx    [Layout con sidebar + navigation]
│   ├── ErrorBoundary.tsx
│   ├── settings/
│   │   ├── ProfileSection
│   │   ├── MeliConnectionSection
│   │   ├── AiConfigSection
│   │   ├── AutoReplySection
│   │   └── ... (8 más)
│   ├── catalog/
│   ├── admin/
│   ├── landing/
│   └── ui/                    [shadcn/ui components]
│
├── contexts/
│   ├── AuthContext.tsx        [Login, user, company_id, role]
│   └── (otros contextos)
│
├── api/
│   ├── ai.ts                  [fetchCopilotSuggestion]
│   ├── questions.ts
│   ├── products.ts
│   └── knowledge.ts
│
├── lib/
│   ├── groupQuestions.ts      [Agrupa por buyer/product]
│   ├── meliTokenHealth.ts     [Token expiration logic]
│   ├── auditLog.ts            [Logging de cambios]
│   └── (utilidades)
│
├── hooks/
│   ├── useAuth.ts
│   ├── usePagination.ts       [Paginación client-side]
│   ├── use-mobile.ts
│   └── (custom hooks)
│
├── types/
│   ├── question.ts
│   └── (domain models)
│
└── integrations/
    └── supabase/client.ts
```

---

## 🚀 **Puntos Fuertes de la Implementación**

| Aspecto           | ✅ Fortaleza                                  |
| ----------------- | --------------------------------------------- |
| **Multi-Tenancy** | RLS + company_id everywhere                   |
| **Escalabilidad** | Paginación server-side (50/página)            |
| **Real-time**     | Supabase Realtime para updates                |
| **UX**            | Responsive, mobile-first, accesible           |
| **IA Context**    | Knowledge base con scope (global + categoria) |
| **Audit**         | Tracking de cambios (answered_by, timestamps) |
| **Security**      | Supabase Auth + RLS + role-based access       |

---

## 🎯 **Recomendaciones de Mejora**

| Área                 | Recomendación                                                            |
| -------------------- | ------------------------------------------------------------------------ |
| **Caché IA**         | Agregar Redis para cachear responses comunes (mismo producto, categoría) |
| **Batch Processing** | Para autopilot masivo, usar job queue (BullMQ)                           |
| **Webhooks**         | Validar signatures de MeLi en Edge Function                              |
| **Analytics**        | Considerar Segment o Posthog para event tracking                         |
| **Email**            | Resend o SendGrid para notificaciones de equipo                          |
| **Billing**          | Stripe integration para plans (Free/Pro/Enterprise)                      |
| **Documentación**    | API docs (Swagger) para futuros integradores                             |

---

Tienes una **base sólida de SaaS multi-tenant**. ¿Quieres que profundice en algún área específica? (p.ej., optimización de queries, implementación de billing, scaling de webhooks MeLi)
