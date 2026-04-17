---
name: knowledge-base-embeddings
description: Knowledge Base con embeddings reales pgvector + OpenAI text-embedding-3-small. Tablas kb_articles y kb_chunks aisladas de knowledge_entries. RPC match_kb_chunks. Edge functions kb-process-article, kb-search, kb-delete-article. UI en /knowledge-base.
type: feature
---

**EL-2 — Knowledge Base con embeddings reales (pgvector)**

- Extensión `vector` habilitada en schema `extensions`.
- **Tablas nuevas y aisladas** (NO tocar `knowledge_entries` ni `/knowledge`, que siguen siendo el CRM Knowledge legacy):
  - `kb_articles`: id, company_id, title (1-200), source_type (`text`|`markdown`), raw_content (1-50000), status (`pending`|`processing`|`ready`|`error`), error_message, created_by.
  - `kb_chunks`: article_id, company_id, chunk_index, content, tokens, `embedding vector(1536)`.
- **Chunking**: ~500 tokens con overlap 50 (heurística chars/4). Modelo `text-embedding-3-small` (1536 dims). Batch de 100 inputs por request a OpenAI.
- **RPC `match_kb_chunks(_company_id, _query_embedding, _match_threshold, _match_count)`**: SECURITY DEFINER, valida `user_belongs_to_company`, usa `extensions.<=>` (cosine distance) y devuelve top-K con similarity.
- **Índice**: `ivfflat (embedding extensions.vector_cosine_ops) WITH (lists = 100)`.
- **RLS**: SELECT por membresía activa, INSERT/UPDATE admin o agent, DELETE solo admin (mismo patrón que `products`).
- **Edge Functions** (todas con `getUser` + verificación de membresía activa contra service role):
  - `kb-process-article`: borra chunks viejos (idempotente), chunkea, llama OpenAI en batches, bulk insert, marca `ready`/`error`.
  - `kb-search`: embed de la query + RPC. Limita query a 2000 chars, match_count 1-20, threshold 0-1.
  - `kb-delete-article`: admin-only, cascade vía FK.
- **UI**: ruta `/knowledge-base` (NO `/knowledge`). Sidebar grupo Catálogo. Realtime sobre `kb_articles` filtrado por `currentCompanyId`.
- **Secret**: `OPENAI_API_KEY` (requerido).
- **Storage bucket**: pospuesto a EL-2.1 junto con parser PDF/DOCX (esta iteración es solo textarea con texto/markdown).
- **Próximo (EL-3)**: integrar `kb-search` en `ai-copilot` para RAG real sobre los chunks vectorizados.
