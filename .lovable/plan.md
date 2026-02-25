

## Plan: Convertir Analytics en Home del Dashboard + Widget de actividad reciente

### Entendimiento

- **Home** = la página actual de Analytics (KPIs, charts, rankings) + un **widget nuevo** que muestra las últimas 4-5 preguntas combinando Inbox y Priority en una sola lista compacta.
- Las páginas **Inbox** (`/dashboard` actual) y **Priority** (`/priority`) **siguen existiendo por separado** como están hoy.
- El widget es solo un vistazo rápido, no reemplaza las bandejas.

### Cambios

#### 1. Ruta y navegación

- **`/dashboard`** → renderiza el nuevo **Home** (actualmente Analytics).
- **`/inbox`** → renderiza **Inbox** (actualmente en `/dashboard`).
- **`/priority`** → sigue igual.
- **Sidebar**: `Home` (icono LayoutDashboard) como primer item apuntando a `/dashboard`, luego `Inbox` → `/inbox`, `Priority` → `/priority`. Se elimina el item "Analytics" porque ahora es Home.

#### 2. Widget "Actividad reciente" en Home

Se ubica debajo de "Distribución por Categoría" (el espacio que queda vacío en el grid 2-col).

- Query: últimas 5 preguntas pendientes ordenadas por `created_at DESC`, sin filtrar por `requires_human` (trae ambas).
- Cada fila muestra: indicador visual (badge amber con ⚠️ si `requires_human`, badge azul normal si no), texto truncado de la pregunta, buyer nickname, y tiempo relativo.
- Click en una fila navega a `/priority` o `/inbox` según corresponda.
- Título del card: "Actividad reciente" con un link "Ver todo →".

#### 3. Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/pages/Analytics.tsx` | Renombrar export a `Home`, agregar widget de actividad reciente con query de últimas 5 preguntas. Actualizar título de "Analytics" a "Dashboard". |
| `src/App.tsx` | Cambiar import: `Home` en `/dashboard`, `Inbox` en `/inbox`. |
| `src/components/AppSidebar.tsx` | Actualizar `navItems`: Home → `/dashboard` (icon LayoutDashboard), Inbox → `/inbox`, Priority → `/priority`. Ajustar badge keys y `end` prop. |

#### 4. Detalles técnicos

- El widget hace un `supabase.from('questions').select(...).eq('status','pending').order('created_at', {ascending: false}).limit(5)` — sin filtro de `requires_human`, trayendo ambas.
- Se usa `useNavigate` para redirigir al hacer click en cada item del widget.
- El widget se renderiza como un `Card` más dentro del grid de 2 columnas de Home, ocupando el espacio debajo del panel de distribución por categoría.

