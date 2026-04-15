

## Plan: Fix meli-item-proxy token refresh + error handling

### Problema
`meli-item-proxy` usa el `access_token` sin renovarlo. Con tokens expirados, MeLi devuelve 401 y el Side Panel muestra un error genérico.

### Cambios

**1. `supabase/functions/meli-item-proxy/index.ts`**
- Importar `refreshTokenIfNeeded` desde `../_shared/refreshMeliToken.ts`
- Leer tokenRow completo (`id`, `access_token`, `refresh_token`, `expires_at`, `company_id`)
- Llamar `refreshTokenIfNeeded` antes de fetch a MeLi
- Si fetch con token retorna 401, reintentar sin Authorization (fallback público)
- Mapear 401 como `token_expired` en `item_error.reason`

**2. `src/components/ProductSideCard.tsx`**
- Agregar mensaje específico para `token_expired`: "El token de MeLi expiró. Reconectá desde Configuración."

**3. `CHANGELOG.md`**
- Documentar el fix

### No se toca
OAuth, ai-copilot, webhook, sync, realtime, memberships, meli_tokens schema

