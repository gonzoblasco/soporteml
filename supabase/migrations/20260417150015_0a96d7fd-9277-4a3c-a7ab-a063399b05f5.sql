-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ============================================================
-- TABLE: kb_articles
-- ============================================================
CREATE TABLE public.kb_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  source_type text NOT NULL DEFAULT 'text' CHECK (source_type IN ('text', 'markdown')),
  raw_content text NOT NULL CHECK (char_length(raw_content) BETWEEN 1 AND 50000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'error')),
  error_message text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_kb_articles_company_id ON public.kb_articles(company_id);
CREATE INDEX idx_kb_articles_status ON public.kb_articles(status);

ALTER TABLE public.kb_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view kb_articles"
  ON public.kb_articles FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Admins or agents can insert kb_articles"
  ON public.kb_articles FOR INSERT
  WITH CHECK (
    public.user_belongs_to_company(auth.uid(), company_id)
    AND (
      public.has_membership_role(auth.uid(), company_id, 'admin'::app_role)
      OR public.has_membership_role(auth.uid(), company_id, 'agent'::app_role)
    )
  );

CREATE POLICY "Admins or agents can update kb_articles"
  ON public.kb_articles FOR UPDATE
  USING (
    public.user_belongs_to_company(auth.uid(), company_id)
    AND (
      public.has_membership_role(auth.uid(), company_id, 'admin'::app_role)
      OR public.has_membership_role(auth.uid(), company_id, 'agent'::app_role)
    )
  );

CREATE POLICY "Admins can delete kb_articles"
  ON public.kb_articles FOR DELETE
  USING (
    public.user_belongs_to_company(auth.uid(), company_id)
    AND public.has_membership_role(auth.uid(), company_id, 'admin'::app_role)
  );

CREATE TRIGGER trg_kb_articles_updated_at
  BEFORE UPDATE ON public.kb_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- TABLE: kb_chunks
-- ============================================================
CREATE TABLE public.kb_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.kb_articles(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  content text NOT NULL,
  tokens integer NOT NULL DEFAULT 0,
  embedding extensions.vector(1536),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_kb_chunks_article_id ON public.kb_chunks(article_id);
CREATE INDEX idx_kb_chunks_company_id ON public.kb_chunks(company_id);
CREATE INDEX idx_kb_chunks_embedding ON public.kb_chunks
  USING ivfflat (embedding extensions.vector_cosine_ops) WITH (lists = 100);

ALTER TABLE public.kb_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view kb_chunks"
  ON public.kb_chunks FOR SELECT
  USING (public.user_belongs_to_company(auth.uid(), company_id));

CREATE POLICY "Admins or agents can insert kb_chunks"
  ON public.kb_chunks FOR INSERT
  WITH CHECK (
    public.user_belongs_to_company(auth.uid(), company_id)
    AND (
      public.has_membership_role(auth.uid(), company_id, 'admin'::app_role)
      OR public.has_membership_role(auth.uid(), company_id, 'agent'::app_role)
    )
  );

CREATE POLICY "Admins can delete kb_chunks"
  ON public.kb_chunks FOR DELETE
  USING (
    public.user_belongs_to_company(auth.uid(), company_id)
    AND public.has_membership_role(auth.uid(), company_id, 'admin'::app_role)
  );

-- ============================================================
-- RPC: match_kb_chunks
-- ============================================================
CREATE OR REPLACE FUNCTION public.match_kb_chunks(
  _company_id uuid,
  _query_embedding extensions.vector(1536),
  _match_threshold float DEFAULT 0.5,
  _match_count int DEFAULT 5
)
RETURNS TABLE (
  chunk_id uuid,
  article_id uuid,
  article_title text,
  content text,
  similarity float
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.user_belongs_to_company(auth.uid(), _company_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id AS chunk_id,
    c.article_id,
    a.title AS article_title,
    c.content,
    (1 - (c.embedding OPERATOR(extensions.<=>) _query_embedding))::float AS similarity
  FROM public.kb_chunks c
  JOIN public.kb_articles a ON a.id = c.article_id
  WHERE c.company_id = _company_id
    AND c.embedding IS NOT NULL
    AND (1 - (c.embedding OPERATOR(extensions.<=>) _query_embedding)) > _match_threshold
  ORDER BY c.embedding OPERATOR(extensions.<=>) _query_embedding
  LIMIT _match_count;
END;
$$;