# Fix: enrich-product 404 "Product not found" en usuarios multi-company

## Problema

Al hacer clic en "Enriquecer con IA" en /catalog (mientras se trabaja sobre la company Moderno), la Edge Function devuelve 404 y la pantalla queda en blanco.

**Causa raíz:** `enrich-product` resuelve la company del usuario llamando a `get_user_company_id(user.id)`, que devuelve la membership marcada como **default** del usuario. Para usuarios multi-company (super admin con membership en `a1b2c3d4-...` como default y otra en `667c53e7-...` Moderno), siempre se infiere la default — no la company que el usuario tiene seleccionada en el switcher. Como el producto pertenece a Moderno, el filtro `.eq('company_id', defaultCompanyId)` no encuentra nada → 404.

Esto rompe el patrón ya documentado en el proyecto (`mem://architecture/tenant-context-resolution`): **las acciones manuales iniciadas por la UI deben recibir el `company_id` del tenant activo de forma explícita o derivarlo del recurso, no del default del usuario.**

## Solución

Validar membership contra el `company_id` del **producto** (que ya está en la DB), en lugar de inferir un company_id default del usuario. El producto identifica unívocamente su tenant; solo hay que confirmar que el usuario pertenece a esa company.

### Cambios

**1. `supabase/functions/enrich-product/index.ts`**

- Buscar el producto por `id` solamente (sin filtrar por company_id):
  ```ts
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", product_id)
    .maybeSingle();
  ```
- Si no existe → 404 "Product not found".
- Validar acceso usando la RPC ya existente `user_belongs_to_company(user.id, product.company_id)`. Si no pertenece → 403 Forbidden.
- Reemplazar todos los usos de `companyId` (que venían de `get_user_company_id`) por `product.company_id` en el resto del flujo (búsqueda de `meli_tokens`, etc.).
- Mantener el `try/catch` global ya existente que devuelve 500 con `error.message` para errores inesperados.

**2. CHANGELOG.md**

Agregar entrada:
> Fix: enrich-product respeta multi-tenant — valida membership contra el company_id del producto (vía `user_belongs_to_company`) en vez de asumir la company default del usuario. Resuelve 404 "Product not found" para usuarios con membership en varias empresas.

## Restricciones

- NO tocar el frontend (`EnrichButton.tsx`): el contrato `{ product_id, force_refresh }` se mantiene.
- NO modificar el flujo de IA, cache de MeLi, ni `meli_tokens`.
- NO crear migraciones (la RPC `user_belongs_to_company` ya existe).
- NO tocar `config.toml`.
- Verificar build limpio.

## Validación

1. Reproducir el flujo: en /catalog (company Moderno), abrir un producto y clickear "Enriquecer con IA" → debe ejecutar el enriquecimiento sin 404.
2. Probar con un usuario que NO sea miembro de la company del producto (vía curl con su JWT) → debe devolver 403, no 404.
3. Probar con productId inexistente → 404.
