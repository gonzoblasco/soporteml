

## Plan: Rediseño del Landing (corregido)

### Corrección importante
Elimino la feature "Multi-cuenta" del landing. Cada company = una cuenta de MeLi. Multi-company por usuario queda para v2.

### Cambios en `src/pages/Landing.tsx`

**1. Navbar**
- Quitar botón "Registrarse"
- Dejar "Iniciar Sesión" + toggle tema
- Agregar links ancla: "Funciones", "Cómo funciona", "Contacto"

**2. Hero**
- CTA: "Empezar gratis" → "Acceder al panel" (`/login`)
- Subtítulo: "Solución exclusiva para vendedores profesionales de Mercado Libre"
- Mockup dashboard: agregar barra de stats animada encima ("147 preguntas hoy", "92% respondidas", "< 3 min promedio")

**3. Sección stats animada (NUEVA)**
- Counters con framer-motion: "+10.000 preguntas gestionadas", "< 2 min respuesta promedio", "95% precisión IA", "+50 vendedores"

**4. Features -- grilla de 6 (expandida)**
Las 3 actuales + 3 nuevas:
- "Conexión directa con MeLi" -- Sincronización automática de preguntas
- "Auto-respuesta programable" -- Configurá horarios y reglas de respuesta automática
- "Historial completo" -- Todas las preguntas y respuestas organizadas por producto y fecha

(Se descarta "Multi-cuenta" ya que cada company tiene una sola cuenta MeLi)

**5. Mockups visuales (NUEVA sección)**
- "Así se ve tu panel" con tabs para alternar entre 3 vistas:
  - Bandeja de preguntas (expandir el mockup existente)
  - Panel de respuesta con IA (pregunta + sugerencia + botón publicar)
  - Vista analytics (barras/donut con datos ficticios)
- Todo en HTML/Tailwind, sin imágenes externas

**6. Cómo funciona (mejorado)**
- Los 3 pasos actuales con más texto descriptivo
- Línea conectora visual entre pasos en desktop

**7. Formulario de consultas (REEMPLAZA CTA final)**
- Sección "¿Querés saber más?"
- Dos columnas en desktop: texto izquierda, form derecha
- Campos: Nombre, Email, Mensaje
- Guarda en tabla `contact_inquiries` (anon puede insertar, authenticated puede leer)
- Toast de confirmación al enviar

**8. Footer**
- Links: "Contacto" (ancla), "Acceder" (`/login`)
- Copyright

### Backend -- Migración SQL

```sql
CREATE TABLE public.contact_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert inquiries"
  ON public.contact_inquiries FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read inquiries"
  ON public.contact_inquiries FOR SELECT
  TO authenticated
  USING (true);
```

### Archivos a modificar
- `src/pages/Landing.tsx` -- rediseño completo
- Migración SQL -- tabla `contact_inquiries`

### Notas técnicas
- Counters animados con `framer-motion` + `useInView`
- Tabs de mockups con componente `Tabs` de Radix (ya instalado)
- Formulario usa SDK de Supabase directo (insert anónimo con anon key)
- No se toca `/login` ni `/signup` -- siguen accesibles

