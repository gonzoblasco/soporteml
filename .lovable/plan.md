

## Epic 6: Polish UX & Mobile

### Alcance

Tres pilares: (1) Mejoras de experiencia mobile en todas las secciones, (2) micro-interacciones y transiciones, (3) mejoras de accesibilidad y feedback visual.

---

### 1. Mejoras Mobile

Actualmente el responsive funciona pero hay oportunidades claras de mejora:

- **QuestionDetail en mobile**: La `ProductSideCard` no se oculta en mobile, lo cual rompe el layout. Ocultarla o moverla a un drawer/accordion colapsable.
- **SettingsPage**: Es un archivo de 1357 líneas. Refactorizar en componentes separados ya está hecho internamente, pero en mobile las cards se apilan sin padding adecuado. Agregar scroll snap y mejor spacing.
- **Sidebar mobile**: Agregar **swipe gesture** para abrir/cerrar el sidebar en mobile (actualmente solo funciona con el botón hamburguesa).
- **Bottom action bar**: En QuestionDetail mobile, los botones de acción (Publicar, Archivar, Eliminar) deberían estar en un **sticky bottom bar** para acceso rápido sin scroll.
- **Pull-to-refresh**: Agregar pull-to-refresh en Inbox y Priority en mobile para refrescar manualmente la lista.

---

### 2. Micro-interacciones y transiciones

- **Skeleton loaders**: Reemplazar los spinners genéricos `<Loader2>` con skeleton placeholders en Dashboard (KPI cards), Inbox (lista de preguntas), y Catalog (lista de productos). Da sensación de carga más rápida.
- **Transiciones de página**: Agregar `framer-motion` `AnimatePresence` al `<Outlet>` del DashboardLayout para transiciones suaves entre secciones.
- **Success animation**: Al publicar una respuesta exitosamente, mostrar una animación de checkmark ✓ antes de cerrar.
- **Empty states mejorados**: Mejorar los empty states de PriorityInbox y Catalog con ilustraciones o animaciones sutiles.

---

### 3. Accesibilidad y feedback

- **Keyboard navigation**: Asegurar que Inbox/Priority soporten `↑`/`↓` para navegar entre preguntas y `Enter` para seleccionar.
- **Focus management**: Al seleccionar una pregunta, mover el foco al textarea de respuesta automáticamente.
- **Loading states en botones**: Todos los botones que disparan async (Publicar, Sincronizar, Guardar) deben mostrar spinner + disabled durante la operación (algunos ya lo hacen, unificar).
- **Toast de confirmación en acciones destructivas**: Feedback consistente post-acción (archivar, eliminar).

---

### Archivos a crear/modificar

| Archivo | Cambio |
|---|---|
| `src/components/QuestionDetail.tsx` | Ocultar ProductSideCard en mobile, sticky bottom actions |
| `src/components/SkeletonCards.tsx` | Nuevo — skeleton loaders reutilizables |
| `src/pages/Home.tsx` | Skeletons para KPI cards |
| `src/pages/Inbox.tsx` | Skeletons para lista, keyboard nav |
| `src/pages/PriorityInbox.tsx` | Skeletons, empty state mejorado |
| `src/components/DashboardLayout.tsx` | Transición AnimatePresence en Outlet |
| `src/components/AppSidebar.tsx` | Swipe gesture en mobile |
| `src/pages/CatalogPage.tsx` | Mobile spacing fix |
