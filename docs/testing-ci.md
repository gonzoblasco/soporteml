## Integración de tests en CI

### 1. Suites de tests

- **Lint y typecheck** (existentes):
  - Comandos:
    - `npm run lint`
    - `npm run build` (como typecheck básico vía TypeScript/Vite).

- **Tests unitarios y de componentes (Vitest)**:
  - Comando: `npm test`
  - Cubre:
    - Lógica de UI/estado en componentes React.
    - Módulos de API frontend (`src/api/**`), p.ej. `fetchCopilotSuggestion`.

- **Tests E2E (Playwright)**:
  - Comando: `npm run test:e2e`
  - Requiere:
    - App levantada (`npm run dev` o `npm run preview`).
    - Variable `E2E_BASE_URL` apuntando a la URL del entorno (local, preview o deploy).

### 2. Estrategia de ejecución por rama

- **Push a ramas feature / PRs estándar**:
  - Ejecutar:
    - `npm run lint`
    - `npm test`
  - Objetivo: feedback rápido para cambios frecuentes.

- **PRs etiquetadas como críticas (ej. label `critical-flow`) o que toquen `supabase/functions/**` o `src/pages/**`**:
  - Ejecutar además:
    - `npm run test:e2e`

- **Rama principal (`main`)**:
  - En cada push:
    - `npm run lint`
    - `npm test`
    - `npm run test:e2e`

### 3. Ejemplo de workflow (GitHub Actions, pseudocódigo)

- Job `ci`:
  - `npm ci`
  - `npm run lint`
  - `npm test`
  - Condicional para E2E:
    - Si `github.ref == 'refs/heads/main'` o PR con label `critical-flow`:
      - Levantar la app (`npm run dev` en background o usar un entorno ya desplegado).
      - Ejecutar `E2E_BASE_URL=http://localhost:5173 npm run test:e2e`.

