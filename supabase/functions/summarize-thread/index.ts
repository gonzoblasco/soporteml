import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const { company_id, buyer_id, product_id, force } = body ?? {};
    if (!company_id || !buyer_id || !product_id) {
      return new Response(JSON.stringify({ error: 'missing_params' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Membership check
    const { data: belongs } = await admin.rpc('user_belongs_to_company', {
      _user_id: userId, _company_id: company_id,
    });
    if (!belongs) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Pull every question of the hilo (any status — preserves history).
    const { data: questions, error: qErr } = await admin
      .from('questions')
      .select('id, question_text, final_answer, ai_suggested_answer, status, requires_human, created_at, answered_at')
      .eq('company_id', company_id)
      .eq('buyer_id', buyer_id)
      .eq('product_id', product_id)
      .neq('status', 'deleted')
      .order('created_at', { ascending: true });

    if (qErr) throw qErr;
    if (!questions || questions.length < 2) {
      return new Response(JSON.stringify({ summary: null, reason: 'too_few_questions' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Hash of message-state so we can cache and invalidate.
    const hashInput = questions
      .map((q) => `${q.id}|${q.final_answer ?? ''}|${q.status}`)
      .join('\n');
    const questions_hash = await sha256Hex(hashInput);

    if (!force) {
      const { data: cached } = await admin
        .from('thread_summaries')
        .select('summary, questions_hash')
        .eq('company_id', company_id)
        .eq('buyer_id', buyer_id)
        .eq('product_id', product_id)
        .maybeSingle();
      if (cached && cached.questions_hash === questions_hash) {
        return new Response(JSON.stringify({ summary: cached.summary, cached: true }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Build prompt
    const transcript = questions
      .map((q, i) => {
        const answer = q.final_answer ?? q.ai_suggested_answer ?? '(sin respuesta)';
        return `#${i + 1} Comprador: ${q.question_text}\n   Respuesta: ${answer}`;
      })
      .join('\n\n');

    const systemPrompt = `Sos un asistente que resume hilos de conversación entre un comprador y un vendedor en MercadoLibre. Escribís en español rioplatense neutro (usás 'vos'), tono calmo y profesional. Tu salida es un resumen breve de 3 a 4 viñetas que cubra: temas tratados, intención principal del comprador, y puntos pendientes o de atención. Nunca inventes datos. Máximo 60 palabras totales.`;

    const userPrompt = `Resumí este hilo:\n\n${transcript}`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: 'rate_limited' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: 'credits_exhausted' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!aiRes.ok) {
      const text = await aiRes.text();
      return new Response(JSON.stringify({ error: 'ai_error', details: text }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiJson = await aiRes.json();
    const summary: string = aiJson?.choices?.[0]?.message?.content?.trim() ?? '';
    if (!summary) {
      return new Response(JSON.stringify({ error: 'empty_summary' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await admin
      .from('thread_summaries')
      .upsert({
        company_id, buyer_id, product_id, summary, questions_hash,
        model: 'google/gemini-2.5-flash-lite',
      }, { onConflict: 'company_id,buyer_id,product_id' });

    return new Response(JSON.stringify({ summary, cached: false }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'server_error', details: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});