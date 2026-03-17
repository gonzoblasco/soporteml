import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { refreshTokenIfNeeded, type TokenRow } from "../_shared/refreshMeliToken.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product_id, force_refresh } = await req.json();
    if (!product_id) {
      return new Response(JSON.stringify({ error: "product_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(SUPABASE_URL, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user company (via memberships)
    const { data: companyId } = await supabase.rpc("get_user_company_id", { _user_id: user.id });

    if (!companyId) {
      return new Response(JSON.stringify({ error: "No active membership found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch product (must belong to user's company)
    const { data: product, error: prodErr } = await supabase
      .from("products")
      .select("*")
      .eq("id", product_id)
      .eq("company_id", companyId)
      .single();

    if (prodErr || !product) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const meliItemId = product.meli_item_id || product.external_id;
    if (!meliItemId) {
      return new Response(JSON.stringify({ error: "No meli_item_id to enrich from" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cache-first: check if cache is fresh enough
    let meliCache = product.meli_cache;
    let fetchedFromApi = false;

    if (!force_refresh && product.meli_cache_fetched_at) {
      const cacheAge = Date.now() - new Date(product.meli_cache_fetched_at).getTime();
      if (cacheAge < CACHE_TTL_MS && meliCache) {
        // Cache is fresh — skip API call but still run AI suggestions
      } else {
        meliCache = null; // force refetch
      }
    } else {
      meliCache = null;
    }

    // Fetch from MeLi API if needed
    if (!meliCache) {
      // Get MeLi token
      const { data: tokenRow } = await supabase
        .from("meli_tokens")
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();

      const headers: Record<string, string> = {};
      if (tokenRow) {
        try {
          const appId = Deno.env.get("MELI_APP_ID")!;
          const secretKey = Deno.env.get("MELI_SECRET_KEY")!;
          const accessToken = await refreshTokenIfNeeded(supabase, tokenRow as TokenRow, appId, secretKey);
          headers.Authorization = `Bearer ${accessToken}`;
        } catch (e) {
          console.warn("Token refresh failed, trying public fetch:", (e as Error).message);
        }
      }

      const [itemRes, descRes] = await Promise.all([
        fetch(`https://api.mercadolibre.com/items/${meliItemId}`, { headers }),
        fetch(`https://api.mercadolibre.com/items/${meliItemId}/description`, { headers }),
      ]);

      if (!itemRes.ok) {
        return new Response(JSON.stringify({
          error: "MeLi API error",
          status: itemRes.status,
          detail: await itemRes.text(),
        }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const itemData = await itemRes.json();
      const descData = descRes.ok ? await descRes.json() : null;

      meliCache = {
        title: itemData.title,
        price: itemData.price,
        currency_id: itemData.currency_id,
        condition: itemData.condition,
        available_quantity: itemData.available_quantity,
        sold_quantity: itemData.sold_quantity,
        permalink: itemData.permalink,
        warranty: itemData.warranty,
        pictures: (itemData.pictures ?? []).map((p: any) => ({ url: p.secure_url || p.url })),
        shipping: { free_shipping: itemData.shipping?.free_shipping ?? false },
        attributes: (itemData.attributes ?? [])
          .filter((a: any) => a.value_name)
          .map((a: any) => ({ id: a.id, name: a.name, value_name: a.value_name })),
        variations: (itemData.variations ?? []).map((v: any) => ({
          id: v.id,
          available_quantity: v.available_quantity,
          attribute_combinations: v.attribute_combinations,
        })),
        category_id: itemData.category_id,
        category_name: null as string | null,
        description: descData?.plain_text ?? null,
      };

      // Try to fetch category name
      if (itemData.category_id) {
        try {
          const catRes = await fetch(`https://api.mercadolibre.com/categories/${itemData.category_id}`);
          if (catRes.ok) {
            const catData = await catRes.json();
            (meliCache as any).category_name = catData.name ?? null;
          } else {
            await catRes.text();
          }
        } catch { /* ignore */ }
      }

      fetchedFromApi = true;
    }

    // ── AI Enrichment: generate suggestions from MeLi data ──
    const AI_API_KEY = Deno.env.get("AI_API_KEY");
    let aiSuggestions: Record<string, unknown> | null = null;

    if (AI_API_KEY && meliCache) {
      try {
        const mc = meliCache as any;
        const contextParts: string[] = [];
        if (mc.title) contextParts.push(`Título: ${mc.title}`);
        if (mc.price) contextParts.push(`Precio: $${mc.price} ${mc.currency_id || ''}`);
        if (mc.condition) contextParts.push(`Condición: ${mc.condition === 'new' ? 'Nuevo' : 'Usado'}`);
        if (mc.warranty) contextParts.push(`Garantía: ${mc.warranty}`);
        if (mc.category_name) contextParts.push(`Categoría: ${mc.category_name}`);
        if (mc.shipping?.free_shipping) contextParts.push('Envío gratis: Sí');
        if (mc.available_quantity != null) contextParts.push(`Stock: ${mc.available_quantity}`);
        if (Array.isArray(mc.attributes) && mc.attributes.length > 0) {
          contextParts.push(`Atributos: ${mc.attributes.map((a: any) => `${a.name}: ${a.value_name}`).join(', ')}`);
        }
        if (mc.description) contextParts.push(`Descripción MeLi:\n${mc.description.slice(0, 2000)}`);

        const aiUrl = Deno.env.get("AI_API_URL") || "https://api.openai.com/v1/chat/completions";
        const aiRes = await fetch(aiUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${AI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: Deno.env.get("AI_MODEL") || "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `Sos un asistente de e-commerce que ayuda a completar fichas de producto para un CRM de soporte al cliente.
A partir de los datos crudos de Mercado Libre, generá contenido útil para agentes de soporte.
Respondé SOLO con el tool call solicitado, sin texto adicional.
Las respuestas deben ser en español argentino, concisas y orientadas a soporte (no marketing).`,
              },
              {
                role: "user",
                content: `Datos del producto:\n${contextParts.join('\n')}\n\nGenerá las sugerencias para la ficha CRM.`,
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "enrich_product_fields",
                  description: "Genera contenido CRM a partir de datos de MeLi",
                  parameters: {
                    type: "object",
                    properties: {
                      support_summary: {
                        type: "string",
                        description: "Resumen de 2-4 líneas describiendo el producto para que un agente de soporte pueda responder preguntas. Incluir material, uso, compatibilidad si aplica.",
                      },
                      key_points: {
                        type: "array",
                        items: { type: "string" },
                        description: "3-6 bullets con datos clave del producto que un agente necesita saber (material, medidas, compatibilidad, incluidos, etc.)",
                      },
                      faq_bullets: {
                        type: "array",
                        items: { type: "string" },
                        description: "3-5 preguntas frecuentes con respuesta corta en formato 'Pregunta? Respuesta.' basadas en los datos disponibles.",
                      },
                      warranty_notes: {
                        type: "string",
                        description: "Nota sobre la garantía del producto basada en los datos de MeLi. Si no hay info de garantía, dejá vacío.",
                      },
                      shipping_notes: {
                        type: "string",
                        description: "Nota sobre envío basada en los datos de MeLi (envío gratis, tipo de envío). Si no hay info relevante, dejá vacío.",
                      },
                    },
                    required: ["support_summary", "key_points", "faq_bullets"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "enrich_product_fields" } },
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            aiSuggestions = JSON.parse(toolCall.function.arguments);
          }
        } else {
          const errText = await aiRes.text();
          console.warn("AI enrichment failed:", aiRes.status, errText);
        }
      } catch (e) {
        console.warn("AI enrichment error:", (e as Error).message);
      }
    }

    // ── Build update payload ──
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Always update cache if fetched from API
    if (fetchedFromApi) {
      updatePayload.meli_cache = meliCache;
      updatePayload.meli_cache_fetched_at = new Date().toISOString();
    }

    // Safe fields from MeLi: always fill if empty
    const mc = meliCache as any;
    if (!product.permalink && mc?.permalink) updatePayload.permalink = mc.permalink;
    if (!product.price && mc?.price) updatePayload.price = mc.price;
    if (!product.meli_category_id && mc?.category_id) updatePayload.meli_category_id = mc.category_id;
    if (!product.meli_category_name && mc?.category_name) updatePayload.meli_category_name = mc.category_name;

    // Auto-fill EMPTY human-knowledge fields with AI suggestions
    const autoFilled: string[] = [];
    if (aiSuggestions) {
      const s = aiSuggestions as any;

      if (!product.support_summary && s.support_summary) {
        updatePayload.support_summary = s.support_summary;
        autoFilled.push("support_summary");
      }
      if ((!product.key_points || (Array.isArray(product.key_points) && product.key_points.length === 0)) && s.key_points?.length > 0) {
        updatePayload.key_points = s.key_points;
        autoFilled.push("key_points");
      }
      if ((!product.faq_bullets || (Array.isArray(product.faq_bullets) && product.faq_bullets.length === 0)) && s.faq_bullets?.length > 0) {
        updatePayload.faq_bullets = s.faq_bullets;
        autoFilled.push("faq_bullets");
      }
      if (!product.warranty_notes && s.warranty_notes) {
        updatePayload.warranty_notes = s.warranty_notes;
        autoFilled.push("warranty_notes");
      }
      if (!product.shipping_notes && s.shipping_notes) {
        updatePayload.shipping_notes = s.shipping_notes;
        autoFilled.push("shipping_notes");
      }
    }

    await supabase
      .from("products")
      .update(updatePayload)
      .eq("id", product_id);

    return new Response(JSON.stringify({
      enriched: true,
      product_id,
      fetched_from_api: fetchedFromApi,
      auto_filled: autoFilled,
      fields_updated: Object.keys(updatePayload).filter(k =>
        !["meli_cache", "meli_cache_fetched_at", "updated_at"].includes(k)
      ),
      ai_suggestions: aiSuggestions,
      cache_keys: Object.keys(meliCache as any),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("enrich-product error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
