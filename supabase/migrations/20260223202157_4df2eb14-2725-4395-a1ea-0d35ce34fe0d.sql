
-- Update trigger to accept 'deleted' status
CREATE OR REPLACE FUNCTION public.validate_question_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status NOT IN ('pending', 'published', 'archived', 'error', 'deleted') THEN
    RAISE EXCEPTION 'Invalid question status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$function$;

-- Allow admins to permanently delete company questions
CREATE POLICY "Admins can delete company questions"
ON public.questions FOR DELETE TO authenticated
USING (company_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'admin'));
