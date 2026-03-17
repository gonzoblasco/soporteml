
-- Create function for title similarity search using pg_trgm
CREATE OR REPLACE FUNCTION public.find_similar_products(
  _company_id uuid,
  _product_id uuid,
  _title text,
  _threshold float DEFAULT 0.6,
  _limit int DEFAULT 5
)
RETURNS TABLE(id uuid, title text, similarity float)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.title,
    similarity(p.title, _title)::float AS similarity
  FROM public.products p
  WHERE p.company_id = _company_id
    AND p.id != _product_id
    AND p.status = 'active'
    AND similarity(p.title, _title) > _threshold
  ORDER BY similarity DESC
  LIMIT _limit
$$;
