

## Plan: Landing Page pública para SoporteML

### Resumen

Crear una nueva página `Landing.tsx` en `/landing` que promocione la aplicación. La ruta `/` para usuarios no logueados mostrará esta landing en vez de redirigir a `/login`. Los usuarios logueados seguirán viendo el dashboard (Inbox) en `/`.

### Cambios en el routing (`src/App.tsx`)

- Crear un nuevo componente `SmartHome` que muestre la Landing si el usuario no está logueado, o el dashboard si lo está.
- La ruta `/` usará este componente en lugar del `ProtectedRoute` actual.
- Las demás rutas protegidas (`/priority`, `/analytics`, `/settings`) siguen igual.

### Nueva página `src/pages/Landing.tsx`

Página de marketing con las siguientes secciones, usando framer-motion para animaciones y los design tokens existentes (primary amarillo, glass-panel, text-gradient):

**1. Navbar fija** -- Logo + nombre "SoporteML", botones "Iniciar Sesión" y "Registrarse" (links a `/login`).

**2. Hero** -- Titular grande: "Gestiona las preguntas de Mercado Libre con IA". Subtítulo explicando el valor. CTA principal "Empezar gratis" y CTA secundario "Ver demo". Mockup visual del dashboard (ilustración CSS/gradientes, no imagen externa).

**3. Features (3 columnas)** -- Iconos de lucide-react:
- Respuestas con IA (Sparkles)
- Bandeja prioritaria (AlertTriangle)  
- Analítica en tiempo real (BarChart3)

**4. Cómo funciona (3 pasos)** -- Conectar MeLi, Recibir preguntas, Responder con IA.

**5. CTA final** -- Frase de cierre + botón "Comenzar ahora".

**6. Footer** -- Copyright, links mínimos.

### Estilo

- Reutiliza los tokens CSS existentes: `--primary`, `glass-panel`, `text-gradient`, `glow-primary`.
- Responsive: mobile-first con grid que pasa de 1 a 3 columnas.
- Animaciones con framer-motion (fade-in on scroll via `whileInView`).

### Archivos

| Archivo | Acción |
|---|---|
| `src/pages/Landing.tsx` | Crear |
| `src/App.tsx` | Modificar routing para `/` |

