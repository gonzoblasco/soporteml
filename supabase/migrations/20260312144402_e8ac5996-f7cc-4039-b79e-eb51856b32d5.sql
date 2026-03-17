
-- Table: knowledge_entries
CREATE TABLE public.knowledge_entries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title         text NOT NULL,
  content       text NOT NULL,
  type          text NOT NULL,
  scope         text NOT NULL DEFAULT 'global',
  ai_visible    boolean NOT NULL DEFAULT true,
  is_active     boolean NOT NULL DEFAULT true,
  priority      integer NOT NULL DEFAULT 0,
  created_by    uuid,
  updated_by    uuid,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.knowledge_entries ENABLE ROW LEVEL SECURITY;

create or replace function public.has_membership_role(
  _user_id uuid,
  _company_id uuid,
  _role public.app_role
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.memberships m
    where m.user_id = _user_id
      and m.company_id = _company_id
      and m.role = _role
  );
$$;

CREATE POLICY "Members can view knowledge entries" ON public.knowledge_entries
  FOR SELECT TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Admin or agent can insert knowledge entries" ON public.knowledge_entries
  FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_company(auth.uid(), company_id)
    AND (has_membership_role(auth.uid(), company_id, 'admin')
      OR has_membership_role(auth.uid(), company_id, 'agent')));

CREATE POLICY "Admin or agent can update knowledge entries" ON public.knowledge_entries
  FOR UPDATE TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id)
    AND (has_membership_role(auth.uid(), company_id, 'admin')
      OR has_membership_role(auth.uid(), company_id, 'agent')));

CREATE POLICY "Admin can delete knowledge entries" ON public.knowledge_entries
  FOR DELETE TO authenticated
  USING (user_belongs_to_company(auth.uid(), company_id)
    AND has_membership_role(auth.uid(), company_id, 'admin'));

-- updated_at trigger
CREATE TRIGGER set_knowledge_entries_updated_at
  BEFORE UPDATE ON public.knowledge_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
