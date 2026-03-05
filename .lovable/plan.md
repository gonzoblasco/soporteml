

## Epic 5: Notificaciones & Engagement

### Alcance

Tres pilares: (1) Centro de notificaciones in-app con badge en tiempo real, (2) notificaciones por email para eventos críticos, (3) indicadores de engagement (resumen diario, streaks).

---

### 1. Centro de notificaciones in-app

- **Tabla `notifications`**: Almacena notificaciones por usuario con tipo, título, mensaje, link, leído/no leído.
- **Componente `NotificationBell`**: Icono de campana en el sidebar con badge rojo de no leídas. Click abre un popover con las últimas 20 notificaciones.
- **Realtime**: Suscripción a `postgres_changes` en la tabla `notifications` para actualizar el badge sin refresh.
- **Tipos de notificación**: `new_question`, `priority_question`, `token_expiring`, `answer_published`.

```text
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Edge Func   │────▶│ notifications│────▶│ NotifBell UI │
│ (insert row) │     │   table      │     │ (realtime)   │
└──────────────┘     └──────────────┘     └──────────────┘
```

**Migración SQL:**
```sql
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  link text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users mark own as read"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

---

### 2. Generación automática de notificaciones

- **Edge Function `notify`**: Recibe tipo + company_id, busca los usuarios de esa empresa y crea notificaciones. Llamada desde `sync-meli-questions` cuando llegan preguntas nuevas y desde `publish-meli-answer` cuando se publica una respuesta.
- **Integración en funciones existentes**: Agregar llamada a `notify` al final de `sync-meli-questions` (para preguntas priority) y opcionalmente en `publish-meli-answer`.

---

### 3. Engagement: resumen y métricas rápidas

- **Widget "Resumen del día"** en el Dashboard (Home): card con métricas de hoy vs ayer (preguntas respondidas, tiempo promedio, pendientes) con flechas de tendencia ↑↓.
- **Toast de bienvenida**: Al entrar al dashboard, si hay preguntas priority pendientes, mostrar un toast con "Tenés X preguntas urgentes".

---

### Archivos a crear/modificar

| Archivo | Cambio |
|---|---|
| Migration SQL | Tabla `notifications` + RLS + realtime |
| `supabase/functions/notify/index.ts` | Nueva Edge Function para crear notificaciones |
| `supabase/functions/sync-meli-questions/index.ts` | Llamar a notify para preguntas priority |
| `src/components/NotificationBell.tsx` | Nuevo — campana + popover + badge |
| `src/components/AppSidebar.tsx` | Agregar NotificationBell al header |
| `src/pages/Home.tsx` | Agregar toast de bienvenida con pendientes priority |
| `supabase/config.toml` | Registrar función notify |

