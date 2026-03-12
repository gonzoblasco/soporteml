
-- Add scope_ref column
ALTER TABLE public.knowledge_entries ADD COLUMN scope_ref text;

-- Validation trigger for scope/scope_ref consistency
CREATE OR REPLACE FUNCTION public.validate_knowledge_scope()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.scope = 'global' AND NEW.scope_ref IS NOT NULL THEN
    RAISE EXCEPTION 'scope_ref must be NULL when scope is global';
  END IF;
  IF NEW.scope = 'categoria' AND (NEW.scope_ref IS NULL OR NEW.scope_ref = '') THEN
    RAISE EXCEPTION 'scope_ref is required when scope is categoria';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_knowledge_scope_trigger
  BEFORE INSERT OR UPDATE ON public.knowledge_entries
  FOR EACH ROW EXECUTE FUNCTION public.validate_knowledge_scope();
