import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Embed the question with OpenAI text-embedding-3-small (1536 dims).
 * Returns null on any failure — caller treats KB as empty.
 */
async function embedQuery(query: string, openaiKey: string): Promise<number[] | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: query,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}

/**
 * Search relevant KB chunks for the buyer question (RAG).
 * Non-fatal: returns [] on any failure so the copilot can still answer.
 */
async function searchKbChunks(
  supabase: any,
  questionText: string,
  companyId: string,
  _productId: string | null,
  openaiKey: string
): Promise<Array<{ id: string; content: string; article_title: string; similarity: number }>> {
  try {
    const embedding = await embedQuery(questionText, openaiKey);
    if (!embedding) return [];

    const { data: chunks, error } = await supabase.rpc("match_kb_chunks", {
      _company_id: companyId,
      _query_embedding: `[${embedding.join(",")}]`,
      _match_threshold: 0.45,
      _match_count: 5,
    });

    if (error || !chunks?.length) return [];

    // Increment hit_count fire-and-forget (non-fatal)
    const chunkIds = chunks.map((c: any) => c.chunk_id ?? c.id).filter(Boolean);
    if (chunkIds.length > 0) {
      supabase.rpc("increment_chunk_hit_counts", { chunk_ids: chunkIds }).then(() => {}, () => {});
    }

    return chunks.map((c: any) => ({
      id: c.chunk_id ?? c.id,
      content: c.content,
      article_title: c.article_title ?? "Artículo KB",
      similarity: c.similarity ?? 0,
    }));
  } catch {
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { question_text, product_title, product_price, buyer_nickname, ai_category, ai_suggested_answer, ai_tone, ai_custom_instructions, product_id } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const toneLabel = ai_tone || "profesional";
    const customInstructions = ai_custom_instructions ? `\nInstrucciones adicionales del vendedor: ${ai_custom_instructions}` : "";

    // Fetch caller's company_id for tenant isolation (via memberships)
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: callerCompanyId } = await serviceClient.rpc("get_user_company_id", { _user_id: user.id });

    if (!callerCompanyId) {
      return new Response(JSON.stringify({ error: "No active membership found" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch CRM product knowledge if product_id is provided
    let productKnowledge = "";
    if (product_id) {
      const { data: crmProduct } = await serviceClient
        .from("products")
        .select("support_summary, key_points, shipping_notes, returns_notes, warranty_notes, faq_bullets, do_not_say")
        .eq("id", product_id)
        .eq("company_id", callerCompanyId)
        .maybeSingle();

      if (crmProduct?.support_summary) {
        const parts: string[] = [`\n\n--- CONOCIMIENTO CRM DEL PRODUCTO ---`];
        parts.push(`Resumen: ${crmProduct.support_summary}`);
        if (crmProduct.key_points?.length) parts.push(`Puntos clave:\n${(crmProduct.key_points as string[]).map((p: string) => `• ${p}`).join('\n')}`);
        if (crmProduct.shipping_notes) parts.push(`Envíos: ${crmProduct.shipping_notes}`);
        if (crmProduct.returns_notes) parts.push(`Devoluciones: ${crmProduct.returns_notes}`);
        if (crmProduct.warranty_notes) parts.push(`Garantía: ${crmProduct.warranty_notes}`);
        if (crmProduct.faq_bullets?.length) parts.push(`FAQ:\n${(crmProduct.faq_bullets as string[]).map((f: string) => `• ${f}`).join('\n')}`);
        if (crmProduct.do_not_say?.length) parts.push(`NO PROMETER:\n${(crmProduct.do_not_say as string[]).map((d: string) => `⚠️ ${d}`).join('\n')}`);
        productKnowledge = parts.join('\n');

        // Fetch variants
        const { data: variants } = await serviceClient
          .from("product_variants")
          .select("variant_name, attributes, support_notes")
          .eq("product_id", product_id)
          .is("archived_at", null);

        if (variants?.length) {
          const varLines = variants.map((v: any) => {
            const attrs = Object.entries(v.attributes || {}).map(([k, val]) => `${k}: ${val}`).join(', ');
            return `- ${v.variant_name}${attrs ? ` (${attrs})` : ''}${v.support_notes ? ` — ${v.support_notes}` : ''}`;
          });
          productKnowledge += `\nVariantes:\n${varLines.join('\n')}`;
        }
      }
    }
    // ── KB Search (RAG) ──
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    let kbChunks: Array<{ id: string; content: string; article_title: string; similarity: number }> = [];
    let kbContextBlock = "";

    if (OPENAI_API_KEY && question_text) {
      kbChunks = await searchKbChunks(
        serviceClient,
        question_text,
        callerCompanyId,
        product_id ?? null,
        OPENAI_API_KEY
      );

      if (kbChunks.length > 0) {
        kbContextBlock = "\n\n--- BASE DE CONOCIMIENTO DEL VENDEDOR ---\n" +
          kbChunks
            .map((c) => `[${c.article_title}]\n${c.content}`)
            .join("\n\n") +
          "\n--- FIN BASE DE CONOCIMIENTO ---";
      }
    }

    const systemPrompt = `Sos un copiloto de atención al cliente para vendedores de Mercado Libre en Argentina.
Tu trabajo es analizar la pregunta de un comprador y devolver un JSON estructurado con 3 campos.

Tono: ${toneLabel}. Escribí en español rioplatense neutro, sin tutear.${customInstructions}

Respondé SOLO con un JSON válido (sin markdown, sin backticks), con esta estructura exacta:
{
  "summary": "Resumen en 1-2 oraciones de qué pide o necesita el comprador",
  "draft": "Borrador de respuesta listo para publicar, corto y claro",
  "missing_data": ["lista de datos que faltan para dar una respuesta completa, ej: talle, color, dirección"]
}

Si no falta ningún dato, devolvé "missing_data": [].
Si ya hay una sugerencia previa de IA, podés mejorarla o usarla como base.${productKnowledge}${kbContextBlock}`;

    // Deterministic CRM suggestions based on field completeness
    const crmSuggestions: Array<{message: string; tab?: string}> = [];
    if (product_id) {
      const { data: crmCheck } = await serviceClient
        .from("products")
        .select("support_summary, key_points, shipping_notes, returns_notes, warranty_notes, faq_bullets")
        .eq("id", product_id)
        .eq("company_id", callerCompanyId)
        .maybeSingle();

      if (crmCheck) {
        if (!crmCheck.support_summary) crmSuggestions.push({ message: "Completá el resumen de soporte para respuestas más precisas", tab: "conocimiento" });
        if (!(crmCheck.key_points as string[])?.length) crmSuggestions.push({ message: "Agregá puntos clave del producto", tab: "conocimiento" });
        if (!crmCheck.shipping_notes) crmSuggestions.push({ message: "Completá las notas de envío", tab: "politicas" });
        if (!crmCheck.returns_notes) crmSuggestions.push({ message: "Agregá la política de devoluciones", tab: "politicas" });
        if (!crmCheck.warranty_notes) crmSuggestions.push({ message: "Completá los datos de garantía", tab: "politicas" });
      }
    } else {
      crmSuggestions.push({ message: "Creá una ficha CRM para este producto y mejorá las respuestas automáticas" });
    }

    const userPrompt = `Pregunta del comprador: "${question_text}"
Comprador: ${buyer_nickname || "desconocido"}
Producto: ${product_title || "sin título"}${product_price != null ? ` — $${product_price}` : ""}
Categoría IA: ${ai_category || "sin categorizar"}
${ai_suggested_answer ? `Sugerencia IA previa: "${ai_suggested_answer}"` : "No hay sugerencia previa."}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas solicitudes. Esperá un momento y volvé a intentar." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA agotados. Recargá desde la configuración del workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      return new Response(JSON.stringify({ error: "Error del servicio de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await response.json();
    const finishReason = aiData.choices?.[0]?.finish_reason;
    const raw = aiData.choices?.[0]?.message?.content ?? "";

    if (finishReason === "length" || finishReason === "MAX_TOKENS") {
      console.warn("AI response truncated, finish_reason:", finishReason);
    }

    // Parse JSON from response — robust extraction
    let parsed;
    try {
      let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      // Find JSON object boundaries
      const jsonStart = cleaned.indexOf("{");
      const jsonEnd = cleaned.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
      }
      parsed = JSON.parse(cleaned);
    } catch {
      // Second attempt: fix trailing commas and control chars
      try {
        let fixed = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
        const s = fixed.indexOf("{");
        const e = fixed.lastIndexOf("}");
        if (s !== -1 && e > s) fixed = fixed.substring(s, e + 1);
        fixed = fixed.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]").replace(/[\x00-\x1F\x7F]/g, "");
        parsed = JSON.parse(fixed);
      } catch {
        console.error("Failed to parse AI response:", raw.substring(0, 500));
        parsed = {
          summary: "No pude analizar la pregunta automáticamente.",
          draft: raw || "",
          missing_data: [],
        };
      }
    }

    // Attach CRM suggestions to response
    if (crmSuggestions.length > 0) {
      parsed.crm_suggestions = crmSuggestions;
    }

    // Attach KB sources used (RAG traceability)
    if (kbChunks.length > 0) {
      const uniqueTitles = [...new Set(kbChunks.map((c) => c.article_title))];
      parsed.kb_sources = uniqueTitles;
      parsed.kb_chunks_count = kbChunks.length;
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-copilot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
