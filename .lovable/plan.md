

## Epic 4: Hardening & Confiabilidad

### Alcance

Tres pilares: (1) Error Boundaries para evitar pantallas blancas, (2) corregir todos los hallazgos del escaneo de seguridad RLS, (3) mejorar manejo de errores en la app.

---

### 1. Error Boundary global + por sección

No existe ningún ErrorBoundary en el proyecto. Se creará:

- **`src/components/ErrorBoundary.tsx`**: Componente class-based que captura errores de render. Muestra una UI amigable con botón "Reintentar" y opción de volver al dashboard.
- **Integración en `App.tsx`**: Wrappear `<AppRoutes />` con el ErrorBoundary global.
- **ErrorBoundary por sección**: Wrappear cada ruta del dashboard (Home, Inbox, Catalog, Settings, etc.) con un boundary individual para que un crash en una sección no tire toda la app.

---

### 2. Corrección de hallazgos de seguridad RLS (8 findings)

Migraciones SQL para resolver:

| Finding | Nivel | Acción |
|---|---|---|
| `contact_inquiries` INSERT `WITH CHECK (true)` | warn | Reemplazar por política anon-only o mantener (es un form público, aceptable) |
| `contact_inquiries` SELECT expuesto | error | Ya tiene `is_super_admin()` — el scan parece falso positivo, verificar |
| `meli_tokens` sin SELECT para company | error | **No agregar** SELECT para usuarios normales — los tokens se acceden vía Edge Functions con service role. Esto es by design. |
| `meli_connection_status` sin policies | warn | Agregar SELECT policy: `company_id = get_user_company_id(auth.uid())` |
| `meli_tokens` sin INSERT/UPDATE | warn | No cambiar — tokens se manejan desde Edge Functions con service role |
| `audit_logs` sin INSERT | warn | No cambiar — inserts via Edge Function `audit-log` con service role |
| `products` sin DELETE | info | Agregar DELETE policy para admins |
| Leaked password protection | warn | Habilitar via auth config |

**Migraciones concretas:**
```sql
-- meli_connection_status: allow company members to SELECT
CREATE POLICY "Company members can view connection status"
ON public.meli_connection_status FOR SELECT
TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

-- products: allow admin DELETE
CREATE POLICY "Admins can delete products"
ON public.products FOR DELETE
TO authenticated
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);
```

Se marcarán como "aceptados" los findings que son by-design (tokens via service role, audit via edge function).

---

### 3. Mejorar manejo de errores en la app

- **Wrappear llamadas a `supabase.functions.invoke()`** con try/catch consistente y toasts de error en las páginas principales (Home, Inbox, Catalog, Settings).
- **Agregar estados de error** en los componentes que hacen fetch (mostrar mensaje en lugar de spinner infinito si falla).
- **Habilitar leaked password protection** via auth configuration.

---

### Archivos a crear/modificar

| Archivo | Cambio |
|---|---|
| `src/components/ErrorBoundary.tsx` | Nuevo — componente ErrorBoundary |
| `src/App.tsx` | Wrappear rutas con ErrorBoundary |
| Migration SQL | RLS fixes (2 policies nuevas) |
| Security findings | Marcar 4 findings como aceptados (by design) |

