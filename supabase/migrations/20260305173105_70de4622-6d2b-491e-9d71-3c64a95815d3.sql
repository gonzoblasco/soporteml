
-- products: allow admin DELETE
CREATE POLICY "Admins can delete products"
ON public.products FOR DELETE
TO authenticated
USING (
  company_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Fix find_similar_products RPC to enforce company isolation
CREATE OR REPLACE FUNCTION public.find_similar_products(
  _company_id uuid, _product_id uuid, _title text,
  _threshold double precision DEFAULT 0.6, _limit integer DEFAULT 5
)
RETURNS TABLE(id uuid, title text, similarity double precision)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.title, extensions.similarity(p.title, _title)::float AS similarity
  FROM public.products p
  WHERE p.company_id = _company_id
    AND p.company_id = public.get_user_company_id(auth.uid())
    AND p.id != _product_id
    AND p.status = 'active'
    AND extensions.similarity(p.title, _title) > _threshold
  ORDER BY similarity DESC
  LIMIT _limit
$$;
