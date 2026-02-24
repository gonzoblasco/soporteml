

## Auditoría del Proyecto -- Problemas Identificados

Tras revisar exhaustivamente el código, la base de datos, las edge functions, la seguridad y los datos reales, encontré los siguientes problemas clasificados por severidad.

---

### CRITICOS (pueden causar errores en producción)

**1. Datos corruptos en la base de datos: producto placeholder `MLA1576204659`**
- El producto `fde0b4a3-33c2-4484-9a64-934c21726b5b` tiene `title = "MLA1576204659"`, `price = null`, `permalink = null`. Es un placeholder que nunca se reparó.
- 7 preguntas apuntan a este producto y muestran un ID como título en el UI.
- **Accion**: Ejecutar un UPDATE directo para limpiar este registro o eliminarlo y setear `product_id = null` en las preguntas asociadas.

**2. Nueve preguntas activas (no eliminadas) tienen `product_id = NULL`**
- Preguntas como `13530972947`, `13530993271`, etc. no tienen producto asociado. La lógica de repair en `processQuestion` solo se ejecuta durante un sync, no retroactivamente para estas.
- En el UI muestran "Producto" como fallback genérico, sin ningún contexto sobre qué publicación se hizo la pregunta.

**3. Doble lógica de producto en `sync-meli-questions`**
- `fetchAndStoreProduct()` (líneas 331-392) y la lógica inline en `processQuestion()` (líneas 440-539) hacen lo mismo: buscar producto en DB, fetchear de MeLi, insertar/actualizar. Se usan en contextos distintos (repair vs. new) pero pueden crear inconsistencias.
- La función de repair usa `fetchAndStoreProduct`, pero el flujo normal usa código inline duplicado. Si uno se actualiza y el otro no, divergen.

**4. CORS headers inconsistentes entre edge functions**
- `sync-meli-questions/index.ts` usa headers cortos: `"authorization, x-client-info, apikey, content-type"`
- `publish-meli-answer/index.ts` usa headers largos con los headers adicionales de Supabase (`x-supabase-client-platform`, etc.)
- `meli-oauth-callback` y `disconnect-meli` usan headers cortos.
- Esto puede causar errores CORS silenciosos en ciertos navegadores/versiones del SDK de Supabase.

**5. `publish-meli-answer` no registra `answered_by`**
- Cuando se publica una respuesta (línea 142-149), se setea `final_answer`, `status`, `answered_at`, pero NUNCA se setea `answered_by` con el ID del usuario que publicó. Analytics de "rendimiento por agente" siempre queda vacío para respuestas manuales.

---

### IMPORTANTES (comportamiento incorrecto o degradado)

**6. `QuestionDetail` usa anti-pattern de setState durante render**
- Líneas 27-29: `if (question && question.id !== key) { setKey(...); setAnswer(...); }` -- esto causa un re-render extra en cada cambio de pregunta. Debería usar `useEffect`.

**7. `MeliConnectionStatus` sobreescribe `fetch` como nombre de variable**
- Línea 12-13: `const fetch = async () => { ... }` sobreescribe la función global `fetch`. No causa bug ahora pero es una bomba de tiempo si alguien agrega `fetch()` dentro de esa función.

**8. `disconnect-meli` usa `getClaims()` que puede no existir**
- Línea 33: `anonClient.auth.getClaims(token)` -- este método no es estándar en todas las versiones del SDK de Supabase. Podría fallar silenciosamente. Mejor usar `getUser()`.

**9. `SettingsPage.tsx` tiene 860 líneas en un solo archivo**
- No es un bug, pero es un archivo monolítico difícil de mantener. Si algo falla en un componente interno (como el warning de `TrashSection` con refs en AlertDialog), es difícil aislar.

**10. Console warning: `TrashSection` pasa un ref a `AlertDialog`**
- Los logs muestran: "Function components cannot be given refs" en `TrashSection`. Indica uso incorrecto de `AlertDialog` como child directo con ref forwarding.

**11. Mock data (`mockData.ts`) sigue en el proyecto**
- El archivo `src/data/mockData.ts` con datos falsos sigue existiendo. No se usa en producción pero agrega confusión y peso innecesario.

**12. `Index.tsx` legacy -- redirige a `Inbox` pero se llama "Index"**
- La ruta `/dashboard` renderiza `Inbox` (importado como tal en App.tsx), pero el archivo se llama `src/pages/Index.tsx` en el listado. Inconsistencia de naming.

---

### SEGURIDAD

**13. Leaked password protection deshabilitada**
- El linter de la base de datos reporta que la protección contra contraseñas filtradas está desactivada. Los usuarios podrían registrarse con contraseñas ya comprometidas en breaches conocidos.

**14. `MELI_APP_ID` hardcodeado en el frontend**
- `SettingsPage.tsx` línea 20: `const MELI_APP_ID = '8921097700859218'` -- esto es una APP ID de MeLi visible en el código fuente público. Aunque no es un secreto per se (es necesario para el OAuth flow del lado del cliente), es mejor práctica no hardcodearlo.

**15. Edge functions `sync-meli-questions` y `meli-webhook` sin autenticación**
- Configuradas con `verify_jwt = false` y no validan ningún secreto ni token. Cualquiera puede triggerear un sync enviando un POST al endpoint. Podría ser usado para DDoS o para forzar rate limits en la API de MeLi.

---

### DATOS

**16. 5 productos mock en la tabla `products`**
- Los productos Samsung, MacBook, Monitor, Sony, iPhone con IDs tipo `b1b2c3d4-aaaa-bbbb-cccc-*` son datos de prueba que nunca se limpiaron. Aparecen en Analytics distorsionando métricas.

**17. Preguntas mock en la tabla `questions`**
- Las preguntas con `meli_question_id` tipo `Q-10001`, `Q-10002`, etc. son datos de prueba asociados a los productos mock.

---

### Plan de Correcciones Propuesto

1. **Limpiar datos corruptos**: SQL migration para eliminar producto placeholder y productos/preguntas mock
2. **Unificar lógica de producto**: Refactorizar `processQuestion` para usar `fetchAndStoreProduct` en todos los casos
3. **Corregir `answered_by`** en `publish-meli-answer`: pasar el user ID del auth header y guardarlo
4. **Homogeneizar CORS headers** en todas las edge functions
5. **Corregir anti-patterns React**: `setState` durante render en `QuestionDetail`, variable `fetch` en `MeliConnectionStatus`
6. **Fix warning de TrashSection**: corregir el uso de refs con AlertDialog
7. **Habilitar leaked password protection** en la configuración de auth
8. **Agregar validación mínima** en `sync-meli-questions` y `meli-webhook` (al menos un shared secret)
9. **Eliminar `mockData.ts`** y cualquier import residual

