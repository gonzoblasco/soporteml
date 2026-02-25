import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function refreshTokenIfNeeded(
  supabase: any,
  tokenRow: any,
  appId: string,
  secretKey: string,
): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(tokenRow.expires_at);

  if (expiresAt.getTime() - now.getTime() > 10 * 60 * 1000) {
    return tokenRow.access_token;
  }

  if (!tokenRow.refresh_token) {
    console.error("Token expired and no refresh_token available for company:", tokenRow.company_id);
    throw new Error("Token expired and no refresh_token. Please reconnect MercadoLibre.");
  }

  console.log("Refreshing MeLi token for company:", tokenRow.company_id);

  const res = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: appId,
      client_secret: secretKey,
      refresh_token: tokenRow.refresh_token,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Token refresh failed:", errText);
    throw new Error(`Token refresh failed: ${res.status}`);
  }

  const data = await res.json();
  const expiresAtNew = new Date(Date.now() + data.expires_in * 1000).toISOString();

  const updatePayload: Record<string, any> = {
    access_token: data.access_token,
    expires_at: expiresAtNew,
    updated_at: new Date().toISOString(),
  };

  // Solo actualizar refresh_token si MeLi devolvió uno nuevo
  if (data.refresh_token) {
    updatePayload.refresh_token = data.refresh_token;
  }

  console.log("Token refreshed. New refresh_token received:", !!data.refresh_token);

  await supabase
    .from("meli_tokens")
    .update(updatePayload)
    .eq("id", tokenRow.id);

  return data.access_token;
}

async function generateAiAnswer(
  questionText: string,
  productContext: string,
  aiTone: string = "profesional",
  aiCustomInstructions: string | null = null,
  exclusionRules: string | null = null
): Promise<{ answer: string; category: string; requires_human: boolean; requires_human_reason: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return { answer: "", category: "Otro", requires_human: false, requires_human_reason: "" };
  }

  const toneMap: Record<string, string> = {
    profesional: "de forma profesional y cordial",
    casual: "de forma casual, cercana y amigable",
    tecnico: "de forma técnica y precisa",
  };
  const toneInstruction = toneMap[aiTone] || toneMap["profesional"];

  let systemPrompt = `Sos un asistente de ventas en MercadoLibre. Respondé preguntas de compradores ${toneInstruction}.

REGLAS IMPORTANTES:
- NUNCA le digas al comprador que consulte la publicación, que mire la página, o que revise los detalles del producto. Vos tenés toda la información disponible y debés responder directamente.
- Si la información solicitada está en los datos del producto que te doy, respondé con esa información concreta.
- Si la información NO está disponible en los datos del producto, decí honestamente que no tenés esa información y ofrecé ayuda alternativa.
- Respondé de forma directa y útil, con datos concretos (colores, medidas, precios, etc.).
- No uses más de 350 caracteres en la respuesta (límite de MeLi).

Clasificá cada pregunta en UNA de estas categorías: Precio, Stock, Técnico, Envío, Garantía, Otro.

EVALUACIÓN DE INTERVENCIÓN HUMANA:
Determiná si esta pregunta requiere intervención humana. Marcá requires_human = true cuando:
- Sea una negociación de precio, oferta o contraoferta
- Involucre compra/venta/trueque de vehículos, motos, o bienes de alto valor
- El comprador pida contacto directo, teléfono o comunicación fuera de MeLi
- Sea una queja seria o conflicto que necesite atención personal
- Involucre temas legales, financiamiento, o condiciones especiales de pago`;

  if (exclusionRules) {
    systemPrompt += `\n\nREGLAS ADICIONALES DE EXCLUSIÓN (marcá requires_human = true si aplican):\n${exclusionRules}`;
  }

  systemPrompt += `\n\nRespondé en JSON con este formato: {"answer": "tu respuesta", "category": "categoría", "requires_human": true/false, "requires_human_reason": "razón breve si aplica"}`;

  if (aiCustomInstructions) {
    systemPrompt += `\n\nInstrucciones adicionales del vendedor:\n${aiCustomInstructions}`;
  }

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Datos del producto:\n${productContext}\n\nPregunta del comprador: "${questionText}"`,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      console.error("AI gateway error:", await res.text());
      return { answer: "", category: "Otro", requires_human: false, requires_human_reason: "" };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        answer: parsed.answer || "",
        category: parsed.category || "Otro",
        requires_human: parsed.requires_human ?? false,
        requires_human_reason: parsed.requires_human_reason || "",
      };
    }
    return { answer: content.slice(0, 350), category: "Otro", requires_human: false, requires_human_reason: "" };
  } catch (e) {
    console.error("AI generation error:", e);
    return { answer: "", category: "Otro", requires_human: false, requires_human_reason: "" };
  }
}

async function fetchMeliCategoryName(categoryId: string): Promise<string> {
  try {
    const res = await fetch(`https://api.mercadolibre.com/categories/${categoryId}`);
    if (res.ok) {
      const data = await res.json();
      return data.name || categoryId;
    }
  } catch (e) {
    console.error("Error fetching category name:", e);
  }
  return categoryId;
}

async function autoPublishAnswer(
  accessToken: string,
  meliQuestionId: string,
  answerText: string
): Promise<boolean> {
  try {
    const res = await fetch("https://api.mercadolibre.com/answers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        question_id: Number(meliQuestionId),
        text: answerText,
      }),
    });

    if (!res.ok) {
      console.error("Auto-publish failed:", await res.text());
      return false;
    }
    console.log("Auto-published answer for question:", meliQuestionId);
    return true;
  } catch (e) {
    console.error("Auto-publish error:", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const MELI_APP_ID = Deno.env.get("MELI_APP_ID")!;
    const MELI_SECRET_KEY = Deno.env.get("MELI_SECRET_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let body: any = {};
    try { body = await req.json(); } catch { /* cron calls with empty body */ }

    let query = supabase.from("meli_tokens").select("*");
    if (body.meli_user_id) {
      query = query.eq("meli_user_id", body.meli_user_id);
    }
    const { data: tokenRows, error: tokensErr } = await query;

    if (tokensErr || !tokenRows?.length) {
      console.log("No MeLi tokens found", tokensErr);
      return new Response(JSON.stringify({ synced: 0, message: "No tokens" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalSynced = 0;

    for (const tokenRow of tokenRows) {
      try {
        const accessToken = await refreshTokenIfNeeded(
          supabase, tokenRow, MELI_APP_ID, MELI_SECRET_KEY
        );

        // Fetch AI + auto-reply settings for this company
        const { data: settings } = await supabase
          .from("company_settings")
          .select("ai_tone, ai_custom_instructions, auto_reply_enabled, auto_reply_exclusion_rules, sync_interval_minutes, last_synced_at")
          .eq("company_id", tokenRow.company_id)
          .maybeSingle();

        const aiTone = settings?.ai_tone || "profesional";
        const aiCustomInstructions = settings?.ai_custom_instructions || null;
        const autoReplyEnabled = settings?.auto_reply_enabled ?? false;
        const exclusionRules = settings?.auto_reply_exclusion_rules || null;

        // For cron-triggered calls, respect per-company sync interval
        const isCron = body.source === "cron";
        if (isCron && settings?.last_synced_at) {
          const intervalMs = (settings.sync_interval_minutes ?? 15) * 60 * 1000;
          const elapsed = Date.now() - new Date(settings.last_synced_at).getTime();
          if (elapsed < intervalMs) {
            console.log(`Skipping company ${tokenRow.company_id}: last synced ${Math.round(elapsed / 1000)}s ago, interval is ${settings.sync_interval_minutes}min`);
            continue;
          }
        }

        if (body.resource) {
          const qRes = await fetch(`https://api.mercadolibre.com${body.resource}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (qRes.ok) {
            const q = await qRes.json();
            const synced = await processQuestion(supabase, q, tokenRow.company_id, accessToken, aiTone, aiCustomInstructions, autoReplyEnabled, exclusionRules);
            if (synced) totalSynced++;
          }
          continue;
        }

        const questionsRes = await fetch(
          `https://api.mercadolibre.com/my/received_questions/search?status=UNANSWERED&seller_id=${tokenRow.meli_user_id}&sort_fields=date_created&sort_types=DESC&limit=50`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!questionsRes.ok) {
          console.error("Failed to fetch questions:", await questionsRes.text());
          continue;
        }

        const questionsData = await questionsRes.json();
        const questions = questionsData.questions || [];

        for (const q of questions) {
          const synced = await processQuestion(supabase, q, tokenRow.company_id, accessToken, aiTone, aiCustomInstructions, autoReplyEnabled, exclusionRules);
          if (synced) totalSynced++;
        }

        // Update last_synced_at for this company
        await supabase
          .from("company_settings")
          .upsert(
            { company_id: tokenRow.company_id, last_synced_at: new Date().toISOString() },
            { onConflict: "company_id" }
          );
      } catch (companyErr) {
        console.error(`Error syncing for company ${tokenRow.company_id}:`, companyErr);
      }
    }

    return new Response(
      JSON.stringify({ synced: totalSynced, message: `Synced ${totalSynced} questions` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function fetchItemFromMeli(itemId: string, accessToken: string): Promise<any | null> {
  try {
    console.log(`Fetching item from MeLi: /items/${itemId}`);

    // Fallback 1: Authenticated endpoint
    let itemRes = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (itemRes.ok) return await itemRes.json();
    console.log(`Auth item fetch returned ${itemRes.status}, trying public endpoint...`);

    // Fallback 2: Public endpoint (no auth)
    itemRes = await fetch(`https://api.mercadolibre.com/items/${itemId}`);
    if (itemRes.ok) return await itemRes.json();
    console.log(`Public item fetch returned ${itemRes.status}, trying multiget endpoint...`);

    // Fallback 3: Multiget endpoint
    itemRes = await fetch(`https://api.mercadolibre.com/items?ids=${itemId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (itemRes.ok) {
      const multigetData = await itemRes.json();
      if (Array.isArray(multigetData) && multigetData.length > 0 && multigetData[0].code === 200) {
        console.log(`Multiget succeeded for ${itemId}`);
        return multigetData[0].body;
      }
      console.error(`Multiget returned code ${multigetData?.[0]?.code} for ${itemId}`);
    } else {
      console.error(`Multiget HTTP ${itemRes.status} for ${itemId}`);
    }

    console.error(`All item fetch methods failed for ${itemId}`);
    return null;
  } catch (e) {
    console.error("Error fetching product:", e);
    return null;
  }
}

async function fetchAndStoreProduct(
  supabase: any,
  itemId: string,
  companyId: string,
  accessToken: string,
): Promise<string | null> {
  // Check if product already exists in DB
  const { data: existingProduct } = await supabase
    .from("products")
    .select("id, title")
    .eq("meli_item_id", itemId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (existingProduct) {
    // If title is a placeholder (equals meli_item_id), try to repair it
    if (existingProduct.title === itemId) {
      const item = await fetchItemFromMeli(itemId, accessToken);
      if (item && item.title && item.title !== itemId) {
        console.log(`Repairing product title for ${itemId}: "${existingProduct.title}" -> "${item.title}"`);
        await supabase
          .from("products")
          .update({
            title: item.title,
            price: item.price ?? undefined,
            permalink: item.permalink ?? undefined,
          })
          .eq("id", existingProduct.id);
      }
    }
    return existingProduct.id;
  }

  const item = await fetchItemFromMeli(itemId, accessToken);

  if (item) {
    const itemCategoryId = item.category_id || null;
    let itemCategoryName: string | null = null;
    if (itemCategoryId) {
      itemCategoryName = await fetchMeliCategoryName(itemCategoryId);
    }

    const { data: newProduct } = await supabase
      .from("products")
      .insert({
        company_id: companyId,
        meli_item_id: itemId,
        title: item.title,
        price: item.price,
        permalink: item.permalink,
        meli_category_id: itemCategoryId,
        meli_category_name: itemCategoryName,
      })
      .select("id")
      .single();

    return newProduct?.id || null;
  }

  console.error(`Could not fetch real product data for item_id: ${itemId}. Skipping product insert to avoid placeholder title.`);
  return null;
}

async function processQuestion(
  supabase: any,
  q: any,
  companyId: string,
  accessToken: string,
  aiTone: string = "profesional",
  aiCustomInstructions: string | null = null,
  autoReplyEnabled: boolean = false,
  exclusionRules: string | null = null
): Promise<boolean> {
  const meliQuestionId = String(q.id);

  // Check if this question was permanently dismissed (blacklisted)
  const { data: dismissed } = await supabase
    .from("dismissed_meli_questions")
    .select("id")
    .eq("meli_question_id", meliQuestionId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (dismissed) {
    console.log(`Skipping dismissed question ${meliQuestionId}`);
    return false;
  }

  const { data: existing } = await supabase
    .from("questions")
    .select("id, product_id")
    .eq("meli_question_id", meliQuestionId)
    .maybeSingle();

  if (existing) {
    // If question exists WITH product_id, nothing to do
    if (existing.product_id) return false;

    // If no item_id to look up, nothing we can do
    if (!q.item_id) return false;

    // Repair: question exists but product_id is null — re-fetch item data
    console.log(`Repairing question ${meliQuestionId}: product_id is null, re-fetching item ${q.item_id}`);
    const repairedProductId = await fetchAndStoreProduct(supabase, q.item_id, companyId, accessToken);

    if (repairedProductId) {
      await supabase
        .from("questions")
        .update({ product_id: repairedProductId })
        .eq("id", existing.id);
      console.log(`Repaired question ${meliQuestionId} with product_id ${repairedProductId}`);
      return true;
    }
    return false;
  }

  let productTitle = "Producto";
  let productId: string | null = null;
  let productContext = `Título: ${productTitle}`;
  let productCategoryId: string | null = null;

  console.log(`Question ${meliQuestionId} has item_id: ${q.item_id}, from: ${JSON.stringify(q.from)}`);
  if (q.item_id) {
    const { data: product } = await supabase
      .from("products")
      .select("id, title, price, permalink, meli_category_id")
      .eq("meli_item_id", q.item_id)
      .eq("company_id", companyId)
      .maybeSingle();

    if (product) {
      productId = product.id;
      productTitle = product.title;
      productCategoryId = product.meli_category_id;
    }

    // Fetch item data using shared helper
    const item = await fetchItemFromMeli(q.item_id, accessToken);

    // Process item data if we got it
    if (item) {
      productTitle = item.title;

      const itemCategoryId = item.category_id || null;
      let itemCategoryName: string | null = null;
      if (itemCategoryId) {
        itemCategoryName = await fetchMeliCategoryName(itemCategoryId);
        productCategoryId = itemCategoryId;
      }

      const contextParts: string[] = [`Título: ${item.title}`];
      if (item.price) contextParts.push(`Precio: $${item.price}`);
      if (item.currency_id) contextParts.push(`Moneda: ${item.currency_id}`);
      if (item.available_quantity != null) contextParts.push(`Stock disponible: ${item.available_quantity}`);
      if (item.condition) contextParts.push(`Condición: ${item.condition === 'new' ? 'Nuevo' : 'Usado'}`);
      if (item.warranty) contextParts.push(`Garantía: ${item.warranty}`);
      if (item.shipping?.free_shipping) contextParts.push(`Envío gratis: Sí`);

      if (item.attributes?.length) {
        const relevantAttrs = item.attributes
          .filter((a: any) => a.value_name && !['ITEM_CONDITION', 'GTIN'].includes(a.id))
          .slice(0, 15)
          .map((a: any) => `${a.name}: ${a.value_name}`);
        if (relevantAttrs.length) contextParts.push(`Atributos:\n${relevantAttrs.join('\n')}`);
      }

      if (item.variations?.length) {
        const varDescriptions = item.variations.map((v: any) => {
          const combos = v.attribute_combinations?.map((a: any) => `${a.name}: ${a.value_name}`).join(', ') || '';
          const stock = v.available_quantity != null ? ` (stock: ${v.available_quantity})` : '';
          return `- ${combos}${stock}`;
        });
        contextParts.push(`Variantes disponibles:\n${varDescriptions.join('\n')}`);
      }

      productContext = contextParts.join('\n');

      // Store product if not already in DB
      if (!productId) {
        const { data: newProduct } = await supabase
          .from("products")
          .insert({
            company_id: companyId,
            meli_item_id: q.item_id,
            title: item.title,
            price: item.price,
            permalink: item.permalink,
            meli_category_id: itemCategoryId,
            meli_category_name: itemCategoryName,
          })
          .select("id")
          .single();

        if (newProduct) productId = newProduct.id;
      } else {
        const updates: Record<string, unknown> = {};

        if (product.title !== item.title) {
          updates.title = item.title;
        }
        if (item.price != null && product.price !== item.price) {
          updates.price = item.price;
        }
        if (item.permalink && product.permalink !== item.permalink) {
          updates.permalink = item.permalink;
        }
        if (itemCategoryId && product.meli_category_id !== itemCategoryId) {
          updates.meli_category_id = itemCategoryId;
          updates.meli_category_name = itemCategoryName;
        }

        if (Object.keys(updates).length > 0) {
          await supabase
            .from("products")
            .update(updates)
            .eq("id", productId);

          if (typeof updates.title === "string") {
            productTitle = updates.title;
          }
        }
      }
    }

    // If item lookup failed, keep question without product_id instead of storing placeholder titles
    if (!productId && q.item_id) {
      console.error(`Could not resolve real title for item ${q.item_id} while processing question ${meliQuestionId}.`);
    }
  }

  // Fetch buyer nickname
  let buyerNickname: string | null = null;
  if (q.from?.id) {
    try {
      const userRes = await fetch(`https://api.mercadolibre.com/users/${q.from.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        buyerNickname = userData.nickname || null;
      }
    } catch (e) {
      console.error("Error fetching buyer info:", e);
    }
  }

  console.log(`Processing question ${meliQuestionId}: item_id=${q.item_id}, product_id=${productId}, buyer=${buyerNickname || q.from?.id}, productTitle=${productTitle}`);

  // Generate AI answer
  const { answer, category, requires_human, requires_human_reason } = await generateAiAnswer(q.text, productContext, aiTone, aiCustomInstructions, exclusionRules);

  // Determine if auto-reply should fire
  const shouldAutoReply = autoReplyEnabled && answer && !requires_human;

  const baseInsert = {
    meli_question_id: meliQuestionId,
    company_id: companyId,
    product_id: productId,
    question_text: q.text,
    buyer_id: q.from ? String(q.from.id) : null,
    buyer_nickname: buyerNickname,
    ai_suggested_answer: answer || null,
    ai_category: category || null,
    created_at: q.date_created || new Date().toISOString(),
  };

  if (shouldAutoReply) {
    const published = await autoPublishAnswer(accessToken, meliQuestionId, answer);

    const { error: insertErr } = await supabase.from("questions").insert({
      ...baseInsert,
      status: published ? "published" : "pending",
      final_answer: published ? answer : null,
      answered_at: published ? new Date().toISOString() : null,
      requires_human: false,
      requires_human_reason: null,
    });

    if (insertErr) {
      console.error("Error inserting question:", insertErr);
      return false;
    }
    return true;
  }

  // Default: insert as pending
  const { error: insertErr } = await supabase.from("questions").insert({
    ...baseInsert,
    status: "pending",
    requires_human,
    requires_human_reason: requires_human_reason || null,
  });

  if (insertErr) {
    console.error("Error inserting question:", insertErr);
    return false;
  }

  return true;
}
