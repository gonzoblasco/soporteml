// kb-search: embed query + RPC match_kb_chunks
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

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
    const { company_id, query, match_count = 5, match_threshold = 0.5 } = body as {
      company_id?: string; query?: string; match_count?: number; match_threshold?: number;
    };

    if (!company_id || !query || typeof query !== 'string' || query.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'company_id y query requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (query.length > 2000) {
      return new Response(JSON.stringify({ error: 'query demasiado larga (max 2000)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
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

    // Embed query
    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: query }),
    });
    if (!embRes.ok) {
      const t = await embRes.text();
      return new Response(JSON.stringify({ error: `OpenAI ${embRes.status}: ${t.slice(0, 200)}` }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const embJson = await embRes.json();
    const queryEmbedding: number[] = embJson.data[0].embedding;

    // Use user client so RPC sees auth.uid()
    const { data: matches, error: rpcErr } = await userClient.rpc('match_kb_chunks', {
      _company_id: company_id,
      _query_embedding: `[${queryEmbedding.join(',')}]`,
      _match_threshold: Math.max(0, Math.min(1, match_threshold)),
      _match_count: Math.max(1, Math.min(20, match_count)),
    });
    if (rpcErr) {
      return new Response(JSON.stringify({ error: rpcErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ matches: matches ?? [] }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
