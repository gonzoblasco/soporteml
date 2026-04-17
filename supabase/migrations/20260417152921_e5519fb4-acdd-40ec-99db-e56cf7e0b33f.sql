-- Add hit_count to kb_chunks for traceability of which chunks the AI uses
ALTER TABLE public.kb_chunks
  ADD COLUMN IF NOT EXISTS hit_count integer NOT NULL DEFAULT 0;

-- RPC to increment hit_count for a list of chunk ids (called fire-and-forget by ai-copilot)
CREATE OR REPLACE FUNCTION public.increment_chunk_hit_counts(chunk_ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.kb_chunks
  SET hit_count = hit_count + 1
  WHERE id = ANY(chunk_ids);
$$;

REVOKE ALL ON FUNCTION public.increment_chunk_hit_counts(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.increment_chunk_hit_counts(uuid[]) TO service_role;