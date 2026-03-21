

## Auditoría de conexión Supabase ↔ Sistema

### Diagnóstico

El error `supabaseUrl is required` ocurre en el **sitio publicado** (`index-B-L9H9yS.js` = bundle de producción). Significa que `import.meta.env.VITE_SUPABASE_URL` quedó `undefined` cuando se generó el último build de producción. El preview de desarrollo no muestra este error porque Vite inyecta las variables en tiempo real.

**Causa raíz:** El último publish se hizo antes o durante el reset de Git, por lo que el bundle estático no tiene las variables de entorno embebidas.

### Mapa de puntos de conexión auditados

```text
PUNTO DE CONEXIÓN                         ESTADO    NOTAS
─────────────────────────────────────────────────────────────────
1. client.ts (createClient)                ✅ OK     Usa VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY
2. .env (variables)                        ✅ OK     Valores correctos presentes
3. AuthContext.tsx (auth + memberships)    ✅ OK     Importa desde client.ts
4. AICopilotPanel.tsx (fetch directo)     ✅ OK     Usa import.meta.env.VITE_SUPABASE_URL
5. MeliConnectionSection (OAuth redirect) ✅ OK     Usa import.meta.env.VITE_SUPABASE_URL  
6. OnboardingWizard (OAuth redirect)      ✅ OK     Usa import.meta.env.VITE_SUPABASE_URL
7. NotificationBell (realtime)            ✅ OK     Usa import.meta.env.VITE_SUPABASE_URL
8. supabase.functions.invoke (11 usos)    ✅ OK     SDK construye URL internamente
9. Edge Functions (14 funciones)          ✅ OK     Usan Deno.env SUPABASE_URL
10. Secrets configurados                  ✅ OK     Todos presentes en Cloud
```

**Todos los puntos de conexión en código están correctos.** El problema es exclusivamente que el sitio publicado necesita re-publicarse para que Vite embeba las env vars en el bundle.

### Plan de acción

1. **Re-publicar la app** — Esto regenera el bundle de producción con las variables de entorno correctas, resolviendo el error `supabaseUrl is required` en soporteml.lovable.app.

2. **Quitar `optimizeDeps.force`** — Ya cumplió su propósito (limpiar cache de deps duplicadas). Dejarlo activo ralentiza cada inicio de dev server innecesariamente.

### Cambio técnico

**`vite.config.ts`**: Eliminar el bloque `optimizeDeps: { force: true }` que ya no es necesario.

No se requieren otros cambios. El código y la configuración de Cloud están sanos.

