# Conocimientos Aprendidos sobre Testing en SoporteML

Este documento resume los conocimientos adquiridos durante la sesión de mejora del testing en el proyecto SoporteML. Se enfoca en debilidades identificadas, soluciones implementadas y mejores prácticas para mantener y expandir la cobertura de tests en un proyecto React/Vite con Supabase.

## Estado Inicial del Testing

- **Cobertura mínima**: Solo 2 archivos de test existentes (`src/test/example.test.ts` y `src/api/ai.test.ts`), ambos pasando.
- **Framework**: Vitest configurado con jsdom, pero sin coverage habilitado inicialmente.
- **Dependencias**: `@testing-library/react`, `@testing-library/jest-dom`, pero faltaban algunas como `@testing-library/dom`.
- **Problema principal**: Ausencia casi total de tests unitarios para componentes, hooks y lógica de negocio, lo que representa un riesgo alto para la estabilidad del código.

## Configuración de Vitest y Coverage

### Configuración Actual (`vitest.config.ts`)
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});