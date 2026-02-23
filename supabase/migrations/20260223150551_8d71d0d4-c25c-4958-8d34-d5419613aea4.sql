
-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop existing tables (order matters for FK constraints)
DROP TABLE IF EXISTS public.questions CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. Companies (Multi-tenant base)
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 2. Profiles (linked to auth.users, NO role column)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. User Roles (separate table for security)
CREATE TYPE public.app_role AS ENUM ('admin', 'agent');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'agent',
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security-definer function to check roles without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: get company_id for a user (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = _user_id
$$;

-- 4. Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  meli_item_id TEXT NOT NULL,
  title TEXT NOT NULL,
  price NUMERIC,
  permalink TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, meli_item_id)
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 5. Questions (Mercado Libre inquiries)
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  meli_question_id TEXT NOT NULL UNIQUE,
  buyer_id TEXT,
  question_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  ai_suggested_answer TEXT,
  ai_category TEXT,
  final_answer TEXT,
  answered_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  answered_at TIMESTAMP WITH TIME ZONE
);
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Validation trigger for question status instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_question_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'published', 'archived', 'error') THEN
    RAISE EXCEPTION 'Invalid question status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_question_status
  BEFORE INSERT OR UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.validate_question_status();

-- ==================== RLS POLICIES ====================

-- Companies: users can only see their own company
CREATE POLICY "Users can view own company"
  ON public.companies FOR SELECT TO authenticated
  USING (id = public.get_user_company_id(auth.uid()));

-- Profiles: users can view profiles in their company
CREATE POLICY "Users can view company profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- User Roles: users can view their own roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins can manage roles
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Products: company-scoped
CREATE POLICY "Users can view company products"
  ON public.products FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- Questions: company-scoped
CREATE POLICY "Users can view company questions"
  ON public.questions FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update company questions"
  ON public.questions FOR UPDATE TO authenticated
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can insert questions"
  ON public.questions FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- ==================== TRIGGER: Auto-create profile on signup ====================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
