

## Diagnóstico: Por qué el refresh_token vuelve a quedar NULL

### Causa raíz

El problema está en la función `refreshTokenIfNeeded` dentro de `sync-meli-questions/index.ts` (línea 53).

Cuando el sync refresca el token, guarda el resultado así:

```text
.update({
  access_token: data.access_token,
  refresh_token: data.refresh_token,    // ← BUG AQUÍ
  expires_at: expiresAtNew,
})
```

La API de MeLi **a veces no devuelve un nuevo `refresh_token`** en la respuesta del refresh grant. Cuando `data.refresh_token` es `undefined`, el update lo convierte en `null`, **borrando el refresh_token válido que ya existía en la DB**.

Entonces el ciclo es:
1. OAuth callback guarda tokens correctamente (access + refresh) ✅
2. El token expira, sync lo refresca con éxito ✅
3. El update sobreescribe `refresh_token` con `null` porque MeLi no devolvió uno nuevo ❌
4. El NUEVO token expira → no hay refresh_token → error fatal 💀

### Fix

**Archivo**: `supabase/functions/sync-meli-questions/index.ts` (líneas 49-57)

Cambiar el update para que solo sobreescriba `refresh_token` si MeLi devuelve uno nuevo:

```typescript
const updatePayload: Record<string, any> = {
  access_token: data.access_token,
  expires_at: expiresAtNew,
  updated_at: new Date().toISOString(),
};

// Solo actualizar refresh_token si MeLi devolvió uno nuevo
if (data.refresh_token) {
  updatePayload.refresh_token = data.refresh_token;
}

await supabase
  .from("meli_tokens")
  .update(updatePayload)
  .eq("id", tokenRow.id);
```

**Mismo fix preventivo en `meli-oauth-callback/index.ts`** (línea 67): Agregar logging del valor de `refresh_token` recibido para diagnóstico futuro.

### Archivos afectados

| Archivo | Cambio |
|---|---|
| `supabase/functions/sync-meli-questions/index.ts` | Condicionar el update de `refresh_token` para no sobreescribir con `null` |
| `supabase/functions/meli-oauth-callback/index.ts` | Agregar log del refresh_token recibido para monitoreo |

### Post-fix

Después de deployar, reconectar MeLi desde Settings para obtener un par fresco de tokens. A partir de ahí, el refresh_token se preservará entre renovaciones.

