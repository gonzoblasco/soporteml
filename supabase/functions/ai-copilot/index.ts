import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Fetch CRM product knowledge if product_id is provided
    let productKnowledge = "";
    if (product_id) {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: crmProduct } = await serviceClient
        .from("products")
        .select("support_summary, key_points, shipping_notes, returns_notes, warranty_notes, faq_bullets, do_not_say")
        .eq("id", product_id)
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
Si ya hay una sugerencia previa de IA, podés mejorarla o usarla como base.${productKnowledge}`;

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
    const raw = aiData.choices?.[0]?.message?.content ?? "";

    // Parse JSON from response (strip markdown fences if present)
    let parsed;
    try {
      const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", raw);
      parsed = {
        summary: "No pude analizar la pregunta automáticamente.",
        draft: raw || "",
        missing_data: [],
      };
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
