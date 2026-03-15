## Estrategia de testing para Edge Functions

- **Alcance**: funciones en `supabase/functions/**` (IA, Mercado Libre, billing, autenticación/email, utilidades).

### 1. Estructura de ficheros

- Mantener la convención actual de una carpeta por función:
  - `supabase/functions/ai-copilot/index.ts`
  - `supabase/functions/sync-meli-questions/index.ts`
  - `supabase/functions/create-checkout/index.ts`
- Añadir, cuando sea necesario, un fichero de dominio puro por función:
  - `supabase/functions/ai-copilot/domain.ts`
  - `supabase/functions/sync-meli-questions/domain.ts`
- Crear tests asociados al dominio (no al runtime de Deno) en la misma carpeta:
  - `supabase/functions/ai-copilot/domain.test.ts`

### 2. Tipos de tests

- **Tests de dominio (unitarios)**:
  - Operan sobre funciones puras o casi puras (reciben entrada tipada y devuelven salida tipada).
  - No conocen `Request`, `Response`, ni detalles de Supabase.
  - Ejemplos:
    - Construcción del prompt para IA a partir de `question`, `company_settings` y plantillas.
    - Mapeo de errores HTTP externos (Lovable, Stripe, Meli) a códigos/respuestas internas.

- **Tests de contrato HTTP (ligeros)**:
  - Validan que, dado un input de dominio, las llamadas externas se construyen correctamente:
    - URL esperada.
    - Headers mínimos (auth, content-type, etc.).
    - Forma del body (campos obligatorios/opcionales).
  - Se implementan mockeando `fetch` o el cliente que se use para HTTP.

### 3. Mocks de servicios externos

- **Lovable AI (`ai-copilot`)**:
  - Mock de `fetch` que devuelve respuestas JSON estáticas para:
    - Caso feliz (200 con sugerencias).
    - Error de validación (4xx).
    - Error de servidor (5xx / timeout simulado).

- **Stripe (`create-checkout`, `customer-portal`, `check-subscription`)**:
  - Mock de cliente Stripe o llamadas HTTP para:
    - Checkout URL generada correctamente.
    - Portal URL generada correctamente.
    - Suscripción activa / inactiva.

- **Mercado Libre (`meli-oauth-callback`, `sync-meli-questions`, `disconnect-meli`)**:
  - Mock de `fetch` hacia endpoints de Meli:
    - Intercambio de código por tokens.
    - Refresco de tokens.
    - Fetch de preguntas y publicación de respuestas.

### 4. Enfoque de ejecución

- **Opción recomendada**: tests de dominio ejecutados con Vitest desde el monorepo:
  - Importar los módulos de dominio (`domain.ts`) desde el entorno Node/Vitest.
  - Mantener los módulos de dominio libres de APIs específicas de Deno para facilitar esto.
- **Opcional más adelante**: tests E2E de funciones con Deno (`deno test`) en el entorno de Supabase, si se quiere cubrir el wiring completo `Request` → `Response`.

### 5. Prioridad de funciones a cubrir

1. **IA y calidad de respuesta**:
   - `ai-copilot`
   - `backfill-ai-answers`
2. **Billing**:
   - `create-checkout`
   - `check-subscription`
   - `customer-portal`
3. **Mercado Libre**:
   - `meli-oauth-callback`
   - `sync-meli-questions`
   - `disconnect-meli`
   - `publish-meli-answer`

