// kb-process-article: chunk + embed + persist
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

const CHUNK_SIZE = 500; // tokens (approx via /4 chars)
const CHUNK_OVERLAP = 50;
const CHARS_PER_TOKEN = 4;

function chunkText(text: string): { content: string; tokens: number }[] {
  const chunkChars = CHUNK_SIZE * CHARS_PER_TOKEN;
  const overlapChars = CHUNK_OVERLAP * CHARS_PER_TOKEN;
  const stride = chunkChars - overlapChars;
  const chunks: { content: string; tokens: number }[] = [];
  const clean = text.trim();
  if (clean.length === 0) return chunks;

  let i = 0;
  while (i < clean.length) {
    const slice = clean.slice(i, i + chunkChars).trim();
    if (slice.length > 0) {
      chunks.push({ content: slice, tokens: Math.ceil(slice.length / CHARS_PER_TOKEN) });
    }
    if (i + chunkChars >= clean.length) break;
    i += stride;
  }
  return chunks;
}

async function getEmbeddings(inputs: string[]): Promise<number[][]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: inputs,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenAI embeddings ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  return data.data.map((d: { embedding: number[] }) => d.embedding);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY no configurado' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No auth' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { article_id, company_id } = body as { article_id?: string; company_id?: string };
    if (!article_id || !company_id) {
      return new Response(JSON.stringify({ error: 'article_id y company_id requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Ownership check
    const { data: membership } = await admin
      .from('memberships')
      .select('id')
      .eq('user_id', userData.user.id)
      .eq('company_id', company_id)
      .eq('status', 'active')
      .maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: 'No pertenecés a esa empresa' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: article, error: artErr } = await admin
      .from('kb_articles')
      .select('id, company_id, raw_content')
      .eq('id', article_id)
      .eq('company_id', company_id)
      .maybeSingle();
    if (artErr || !article) {
      return new Response(JSON.stringify({ error: 'Artículo no encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await admin.from('kb_articles')
      .update({ status: 'processing', error_message: null })
      .eq('id', article_id);

    // Wipe previous chunks (idempotent reprocessing)
    await admin.from('kb_chunks').delete().eq('article_id', article_id);

    const chunks = chunkText(article.raw_content);
    if (chunks.length === 0) {
      await admin.from('kb_articles').update({
        status: 'error', error_message: 'Contenido vacío tras limpieza',
      }).eq('id', article_id);
      return new Response(JSON.stringify({ error: 'Contenido vacío' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Batch embeddings (100 per request max for safety)
    const BATCH = 100;
    const rows: Array<{ article_id: string; company_id: string; chunk_index: number; content: string; tokens: number; embedding: string }> = [];
    try {
      for (let b = 0; b < chunks.length; b += BATCH) {
        const slice = chunks.slice(b, b + BATCH);
        const embeddings = await getEmbeddings(slice.map((c) => c.content));
        slice.forEach((c, i) => {
          rows.push({
            article_id,
            company_id,
            chunk_index: b + i,
            content: c.content,
            tokens: c.tokens,
            embedding: `[${embeddings[i].join(',')}]`,
          });
        });
      }
    } catch (embErr) {
      const msg = embErr instanceof Error ? embErr.message : String(embErr);
      await admin.from('kb_articles').update({
        status: 'error', error_message: msg.slice(0, 500),
      }).eq('id', article_id);
      return new Response(JSON.stringify({ error: msg }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Bulk insert
    const { error: insErr } = await admin.from('kb_chunks').insert(rows);
    if (insErr) {
      await admin.from('kb_articles').update({
        status: 'error', error_message: insErr.message.slice(0, 500),
      }).eq('id', article_id);
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await admin.from('kb_articles').update({ status: 'ready', error_message: null }).eq('id', article_id);

    return new Response(JSON.stringify({ ok: true, chunks: rows.length }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
