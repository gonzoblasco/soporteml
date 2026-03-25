import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateCopilotDraft } from "../_shared/ai-service.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const AI_API_KEY = Deno.env.get("AI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!AI_API_KEY) throw new Error("AI API key not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify caller is super admin
    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isSuperAdmin } = await anonClient.rpc("is_super_admin");
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: super admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch questions to backfill (pending/needs_human with product_id)
    const { data: questions, error: qErr } = await supabase
      .from("questions")
      .select("id, question_text, product_id, company_id, buyer_nickname, product_meli_id, ai_category")
      .in("status", ["pending", "needs_human"])
      .not("product_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (qErr) throw qErr;
    if (!questions?.length) {
      return new Response(JSON.stringify({ backfilled: 0, message: "No questions to backfill" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let backfilled = 0;
    let errors = 0;

    for (const q of questions) {
      try {
        // Fetch product data
        const { data: product } = await supabase
          .from("products")
          .select("title, price, support_summary, key_points, shipping_notes, returns_notes, warranty_notes, faq_bullets, do_not_say, meli_cache, meli_item_id")
          .eq("id", q.product_id)
          .maybeSingle();

        if (!product) continue;

        // Fetch variants
        const { data: variants } = await supabase
          .from("product_variants")
          .select("variant_name, attributes, support_notes")
          .eq("product_id", q.product_id)
          .is("archived_at", null);

        // Build CRM knowledge (system prompt injection)
        const crmParts: string[] = [];
        if (product.support_summary) crmParts.push(`Resumen: ${product.support_summary}`);
        if (Array.isArray(product.key_points) && product.key_points.length > 0) {
          crmParts.push(`Puntos clave:\n${(product.key_points as string[]).map((k: string) => `• ${k}`).join('\n')}`);
        }
        if (product.shipping_notes) crmParts.push(`Envíos: ${product.shipping_notes}`);
        if (product.returns_notes) crmParts.push(`Devoluciones: ${product.returns_notes}`);
        if (product.warranty_notes) crmParts.push(`Garantía: ${product.warranty_notes}`);
        if (Array.isArray(product.faq_bullets) && product.faq_bullets.length > 0) {
          crmParts.push(`FAQ:\n${(product.faq_bullets as string[]).map((f: string) => `• ${f}`).join('\n')}`);
        }
        if (Array.isArray(product.do_not_say) && product.do_not_say.length > 0) {
          crmParts.push(`NO PROMETER:\n${(product.do_not_say as string[]).map((d: string) => `⚠️ ${d}`).join('\n')}`);
        }
        if (variants?.length) {
          const varLines = variants.map((v: any) => {
            const attrs = Object.entries(v.attributes || {}).map(([k, val]) => `${k}: ${val}`).join(', ');
            return `- ${v.variant_name}${attrs ? ` (${attrs})` : ''}${v.support_notes ? ` — ${v.support_notes}` : ''}`;
          });
          crmParts.push(`Variantes:\n${varLines.join('\n')}`);
        }

        const crmKnowledge = crmParts.length > 0
          ? `\n\n--- CONOCIMIENTO CRM DEL PRODUCTO ---\n${crmParts.join('\n')}`
          : "";

        // Fetch company settings for tone
        const { data: settings } = await supabase
          .from("company_settings")
          .select("ai_tone, ai_custom_instructions")
          .eq("company_id", q.company_id)
          .maybeSingle();

        const aiTone = settings?.ai_tone || "profesional";
        const customInstructions = settings?.ai_custom_instructions
          ? `\nInstrucciones adicionales del vendedor: ${settings.ai_custom_instructions}` : "";

        // Build product context
        let productContext = `Título: ${product.title}`;
        if (product.price) productContext += `\nPrecio: $${product.price}`;
        // Add description from meli_cache if available
        const cachedDesc = (product.meli_cache as any)?.description;
        if (cachedDesc) productContext += `\nDescripción del producto: ${cachedDesc}`;

        const { draft } = await generateCopilotDraft(
          q.question_text,
          productContext,
          {
            aiTone,
            aiCustomInstructions: customInstructions,
            buyerNickname: q.buyer_nickname,
            productTitle: product.title,
            productPrice: product.price,
            crmKnowledge,
          }
        );

        if (draft) {
          await supabase
            .from("questions")
            .update({ ai_suggested_answer: draft })
            .eq("id", q.id);
          backfilled++;
        }

        // Rate limiting: 500ms between requests
        await new Promise(r => setTimeout(r, 500));
      } catch (e) {
        console.error(`Error backfilling question ${q.id}:`, e);
        errors++;
      }
    }

    return new Response(JSON.stringify({ backfilled, errors, total: questions.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Backfill error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
