

## Plan: Borrado de consultas (solo Admins) + Papelera en Settings

### Contexto
Actualmente las preguntas pueden archivarse (`status = 'archived'`) pero nunca eliminarse. Se necesita un flujo de "soft delete" → "hard delete" exclusivo para administradores.

### Diseño

**Nuevo estado `deleted`**: Las preguntas borradas desde el Inbox pasan a `status = 'deleted'` (soft delete). Desde una nueva sección "Papelera" en Settings, el admin puede restaurarlas o eliminarlas permanentemente.

### Cambios

#### 1. Base de datos
- **Migración**: Actualizar el trigger `validate_question_status` para aceptar el nuevo estado `'deleted'` además de los existentes.
- **RLS**: Ya existe policy de DELETE bloqueada en `questions`. Se necesita agregar una policy que permita a admins hacer DELETE permanente:
  ```sql
  CREATE POLICY "Admins can delete company questions"
  ON public.questions FOR DELETE TO authenticated
  USING (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'admin'));
  ```

#### 2. Inbox (`src/pages/Inbox.tsx`)
- Sin cambios en los tabs (no se muestra `deleted` en Inbox).

#### 3. QuestionDetail (`src/components/QuestionDetail.tsx`)
- Importar `useAuth` y verificar `userRole === 'admin'`.
- Agregar botón "Eliminar" (icono Trash2) con confirmación AlertDialog en las acciones de preguntas pendientes y archivadas.
- Al confirmar, actualizar `status` a `'deleted'` (soft delete) y llamar `onUpdated()`.

#### 4. Settings - Papelera (`src/pages/SettingsPage.tsx`)
- Nueva sección `TrashSection` (solo admins), con icono Trash2.
- Consulta preguntas con `status = 'deleted'`, mostrando lista con texto de pregunta, producto y fecha.
- Dos acciones por ítem:
  - **Restaurar**: cambia `status` a `'pending'`.
  - **Eliminar definitivamente**: ejecuta `supabase.from('questions').delete().eq('id', id)` con confirmación AlertDialog.
- Botón "Vaciar papelera" para eliminar todo de una vez (con confirmación).
- Se renderiza en la columna derecha del grid de Settings, después de AiConfigSection.

#### 5. Tipo Question (`src/types/question.ts`)
- Agregar `'deleted'` al type `QuestionStatus`.

### Flujo del usuario

```text
Inbox (admin ve botón "Eliminar")
  → click "Eliminar" → confirmación → status='deleted' → desaparece del Inbox
  → Settings > Papelera → ve la pregunta eliminada
    → "Restaurar" → vuelve a Pendientes
    → "Eliminar definitivamente" → DELETE real de la DB
```

### Seguridad
- Solo admins ven el botón de eliminar en QuestionDetail (check client-side con `userRole`).
- La policy RLS de DELETE solo permite admins (check server-side).
- El soft delete (`status = 'deleted'`) usa la policy UPDATE existente que permite a cualquier usuario de la company, pero el botón solo se muestra a admins.

