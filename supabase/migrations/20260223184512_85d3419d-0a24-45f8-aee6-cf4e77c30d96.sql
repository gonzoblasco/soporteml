
-- 1. Add invite_code column to companies
ALTER TABLE public.companies
ADD COLUMN invite_code text UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex');

-- 2. Generate codes for existing companies
UPDATE public.companies SET invite_code = encode(gen_random_bytes(6), 'hex') WHERE invite_code IS NULL;

-- 3. Make invite_code NOT NULL after backfill
ALTER TABLE public.companies ALTER COLUMN invite_code SET NOT NULL;

-- 4. Replace handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _company_name text;
  _invite_code text;
  _full_name text;
  _company_id uuid;
BEGIN
  _full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  _company_name := NEW.raw_user_meta_data->>'company_name';
  _invite_code := NEW.raw_user_meta_data->>'invite_code';

  IF _company_name IS NOT NULL AND _company_name <> '' THEN
    -- Create new company flow
    INSERT INTO public.companies (name)
    VALUES (_company_name)
    RETURNING id INTO _company_id;

    INSERT INTO public.profiles (id, full_name, company_id)
    VALUES (NEW.id, _full_name, _company_id);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');

  ELSIF _invite_code IS NOT NULL AND _invite_code <> '' THEN
    -- Join existing company flow
    SELECT id INTO _company_id
    FROM public.companies
    WHERE invite_code = _invite_code;

    IF _company_id IS NULL THEN
      -- Invalid code: create profile without company
      INSERT INTO public.profiles (id, full_name)
      VALUES (NEW.id, _full_name);
    ELSE
      INSERT INTO public.profiles (id, full_name, company_id)
      VALUES (NEW.id, _full_name, _company_id);

      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'agent');
    END IF;

  ELSE
    -- Fallback: no company
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, _full_name);
  END IF;

  RETURN NEW;
END;
$$;

-- 5. Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
