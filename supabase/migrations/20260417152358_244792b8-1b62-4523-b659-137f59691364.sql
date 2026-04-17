ALTER TABLE public.kb_articles REPLICA IDENTITY FULL;
ALTER TABLE public.kb_chunks REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kb_articles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kb_chunks;