import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { refreshTokenIfNeeded } from "../_shared/refreshMeliToken.ts";
import { generateAiAnswer } from "../_shared/ai-service.ts";
import { corsHeaders, logEvent } from "../_shared/utils.ts";
import { isOutsideBusinessHours } from "../_shared/business-hours.ts";
import { fetchKnowledgeContext } from "../_shared/knowledge-service.ts";
import { autoPublishMeliAnswer } from "../_shared/meli-service.ts";

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

interface MeliItem {
  id: string;
  title: string;
  price?: number;
  currency_id?: string;
  available_quantity?: number;
  condition?: string;
  warranty?: string;
  permalink?: string;
  category_id?: string;
  shipping?: { free_shipping: boolean };
  attributes?: Array<{ id: string; name: string; value_name: string }>;
  variations?: Array<{
    attribute_combinations?: Array<{ name: string; value_name: string }>;
    available_quantity?: number;
  }>;
}

interface CompanySettings {
  ai_tone?: string;
  ai_custom_instructions?: string;
  auto_reply_enabled?: boolean;
  auto_reply_exclusion_rules?: string;
  auto_reply_mode?: string;
  business_hours?: { days: string[]; start_time: string; end_time: string };
  sync_interval_minutes?: number;
  last_synced_at?: string;
  features_ai_suggestions?: boolean;
  features_autopilot_after_hours?: boolean;
  features_autopilot_in_hours?: boolean;
  autopilot_confidence_threshold?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const MELI_APP_ID = Deno.env.get("MELI_APP_ID")!;
    const MELI_SECRET_KEY = Deno.env.get("MELI_SECRET_KEY")!;

    // Authenticate: require valid JWT (user-triggered) or service role key (cron/webhook)
    let callerUserId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    // Parse body early so we can validate cron calls
    let body: any = {};
    try { body = await req.json(); } catch { /* cron calls may have empty body */ }

    // Allow service role key OR anon key for cron-triggered calls (must include source: "cron")
    const isServiceRole = token === SUPABASE_SERVICE_ROLE_KEY;
    const isAnonKey = token === SUPABASE_ANON_KEY;
    const isCronCall = body.source === "cron";

    if (isServiceRole || (isAnonKey && isCronCall)) {
      // Trusted server-side call (pg_cron or webhook) — skip user auth
      if (isServiceRole && !isCronCall) {
        console.warn("Service role key used without source=cron, rejecting");
        return new Response(JSON.stringify({ error: "Forbidden: service role requires source=cron" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      // Validate user JWT using getClaims (avoids hitting /auth/v1/user)
      const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Store caller's user ID for company scoping below
      callerUserId = claimsData.claims.sub as string;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Scope meli_tokens query: user-triggered calls are restricted to caller's company
    let query = supabase.from("meli_tokens").select("*");
    if (callerUserId) {
      // Prefer explicit company_id from body; fall back to default company
      const explicitCompanyId = body.company_id ?? null;
      let callerCompanyId: string | null = explicitCompanyId;

      if (explicitCompanyId) {
        // Validate user belongs to the requested company
        const { data: belongs } = await supabase.rpc("user_belongs_to_company", {
          _user_id: callerUserId,
          _company_id: explicitCompanyId,
        });
        if (!belongs) {
          return new Response(JSON.stringify({ error: "Forbidden: user does not belong to this company" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        const { data: defaultCompanyId } = await supabase.rpc("get_user_company_id", { _user_id: callerUserId });
        callerCompanyId = defaultCompanyId;
      }

      if (!callerCompanyId) {
        return new Response(JSON.stringify({ error: "No company found for user" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      query = query.eq("company_id", callerCompanyId);
    } else if (body.meli_user_id) {
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
        await logEvent(supabase, tokenRow.company_id, "SYNC_STARTED", "token", tokenRow.id);

        const accessToken = await refreshTokenIfNeeded(
          supabase, tokenRow, MELI_APP_ID, MELI_SECRET_KEY
        );

        // Fetch AI + auto-reply + autopilot settings for this company
        const { data: settings } = await supabase
          .from("company_settings")
          .select("ai_tone, ai_custom_instructions, auto_reply_enabled, auto_reply_exclusion_rules, auto_reply_mode, business_hours, sync_interval_minutes, last_synced_at, features_ai_suggestions, features_autopilot_after_hours, features_autopilot_in_hours, autopilot_confidence_threshold")
          .eq("company_id", tokenRow.company_id)
          .maybeSingle();

        const aiTone = settings?.ai_tone || "profesional";
        const aiCustomInstructions = settings?.ai_custom_instructions || null;
        const exclusionRules = settings?.auto_reply_exclusion_rules || null;
        const businessHours = settings?.business_hours as any || { days: ['lunes','martes','miércoles','jueves','viernes'], start_time: '09:00', end_time: '18:00' };

        // Autopilot feature flags
        const autopilotAfterHours = settings?.features_autopilot_after_hours ?? false;
        const autopilotInHours = settings?.features_autopilot_in_hours ?? false;
        const confidenceThreshold = settings?.autopilot_confidence_threshold ?? 0.85;
        const aiSuggestionsEnabled = settings?.features_ai_suggestions ?? true;

        // Legacy compat: auto_reply_enabled / auto_reply_mode still respected
        const legacyAutoReplyEnabled = settings?.auto_reply_enabled ?? false;
        const legacyAutoReplyMode = settings?.auto_reply_mode ?? 'off';

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
            const synced = await processQuestion(supabase, q, tokenRow.company_id, accessToken, aiTone, aiCustomInstructions, exclusionRules, aiSuggestionsEnabled, autopilotAfterHours, autopilotInHours, confidenceThreshold, businessHours, legacyAutoReplyEnabled, legacyAutoReplyMode);
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
          await logEvent(supabase, tokenRow.company_id, "ERROR", "sync", undefined, { error: "Failed to fetch questions from MeLi" });
          continue;
        }

        const questionsData = await questionsRes.json();
        const questions = questionsData.questions || [];

        for (const q of questions) {
          const synced = await processQuestion(supabase, q, tokenRow.company_id, accessToken, aiTone, aiCustomInstructions, exclusionRules, aiSuggestionsEnabled, autopilotAfterHours, autopilotInHours, confidenceThreshold, businessHours, legacyAutoReplyEnabled, legacyAutoReplyMode);
          if (synced) totalSynced++;
        }

        // Update last_synced_at for this company
        await supabase
          .from("company_settings")
          .upsert(
            { company_id: tokenRow.company_id, last_synced_at: new Date().toISOString() },
            { onConflict: "company_id" }
          );

        await logEvent(supabase, tokenRow.company_id, "SYNC_DONE", "sync", undefined, { questions_synced: totalSynced });
      } catch (companyErr) {
        console.error(`Error syncing for company ${tokenRow.company_id}:`, companyErr);
        await logEvent(supabase, tokenRow.company_id, "ERROR", "sync", undefined, { error: String(companyErr) });
      }
    }

    return new Response(
      JSON.stringify({ synced: totalSynced, message: `Synced ${totalSynced} questions` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    const error = err as Error;
    console.error("Sync error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function fetchItemFromMeli(itemId: string, accessToken: string): Promise<MeliItem | null> {
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
        source: 'meli',
        external_id: itemId,
        external_url: item.permalink ?? null,
      })
      .select("id")
      .single();

    return newProduct?.id || null;
  }

  console.error(`Could not fetch real product data for item_id: ${itemId}. Skipping product insert to avoid placeholder title.`);
  return null;
}

// ─── Fetch CRM context from products + variants (Copilot-grade format) ───
async function fetchCrmContext(supabase: any, productId: string, companyId: string): Promise<string> {
  try {
    const [productRes, variantsRes] = await Promise.all([
      supabase
        .from("products")
        .select("support_summary, key_points, faq_bullets, do_not_say, shipping_notes, returns_notes, warranty_notes")
        .eq("id", productId)
        .eq("company_id", companyId)
        .maybeSingle(),
      supabase
        .from("product_variants")
        .select("variant_name, variant_sku, attributes, support_notes")
        .eq("product_id", productId)
        .eq("company_id", companyId)
        .is("archived_at", null),
    ]);

    const parts: string[] = [];
    const p = productRes.data;

    // Use same format as ai-copilot: structured headers with bullet points
    if (p) {
      if (p.support_summary) parts.push(`Resumen: ${p.support_summary}`);
      if (Array.isArray(p.key_points) && p.key_points.length > 0) {
        parts.push(`Puntos clave:\n${p.key_points.map((k: string) => `• ${k}`).join('\n')}`);
      }
      if (p.shipping_notes) parts.push(`Envíos: ${p.shipping_notes}`);
      if (p.returns_notes) parts.push(`Devoluciones: ${p.returns_notes}`);
      if (p.warranty_notes) parts.push(`Garantía: ${p.warranty_notes}`);
      if (Array.isArray(p.faq_bullets) && p.faq_bullets.length > 0) {
        parts.push(`FAQ:\n${p.faq_bullets.map((f: string) => `• ${f}`).join('\n')}`);
      }
      if (Array.isArray(p.do_not_say) && p.do_not_say.length > 0) {
        parts.push(`NO PROMETER:\n${p.do_not_say.map((d: string) => `⚠️ ${d}`).join('\n')}`);
      }
    }

    const variants = variantsRes.data;
    if (variants?.length) {
      const varLines = variants.map((v: any) => {
        const attrs = Object.entries(v.attributes || {}).map(([k, val]) => `${k}: ${val}`).join(', ');
        return `- ${v.variant_name}${attrs ? ` (${attrs})` : ''}${v.support_notes ? ` — ${v.support_notes}` : ''}`;
      });
      parts.push(`Variantes:\n${varLines.join('\n')}`);
    }

    if (parts.length === 0) return "";
    return `\n\n--- CONOCIMIENTO CRM DEL PRODUCTO ---\n${parts.join('\n')}`;
  } catch (e) {
    console.error("Error fetching CRM context:", e);
    return "";
  }
}

async function processQuestion(
  supabase: any,
  q: any,
  companyId: string,
  accessToken: string,
  aiTone: string = "profesional",
  aiCustomInstructions: string | null = null,
  exclusionRules: string | null = null,
  aiSuggestionsEnabled: boolean = true,
  autopilotAfterHours: boolean = false,
  autopilotInHours: boolean = false,
  confidenceThreshold: number = 0.85,
  businessHours: any = { days: ['lunes','martes','miércoles','jueves','viernes'], start_time: '09:00', end_time: '18:00' },
  legacyAutoReplyEnabled: boolean = false,
  legacyAutoReplyMode: string = 'off',
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
  let product: any = null;

  console.log(`Question ${meliQuestionId} has item_id: ${q.item_id}, from: ${JSON.stringify(q.from)}`);
  if (q.item_id) {
    const { data: existingProd } = await supabase
      .from("products")
      .select("id, title, price, permalink, meli_category_id")
      .eq("meli_item_id", q.item_id)
      .eq("company_id", companyId)
      .maybeSingle();

    if (existingProd) {
      product = existingProd;
      productId = existingProd.id;
      productTitle = existingProd.title;
      productCategoryId = existingProd.meli_category_id;
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
            source: 'meli',
            external_id: q.item_id,
            external_url: item.permalink ?? null,
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

  // ─── Fetch CRM knowledge for system prompt (Copilot-grade) ───
  let crmKnowledge = "";
  if (productId) {
    crmKnowledge = await fetchCrmContext(supabase, productId, companyId);
  }

  // ─── Fetch business knowledge entries ───
  const knowledgeCtx = await fetchKnowledgeContext(supabase, companyId, productCategoryId);
  const businessKnowledge = knowledgeCtx.positive + knowledgeCtx.restrictions;

  // ─── Fetch MeLi item description for richer context ───
  if (q.item_id) {
    try {
      // Check meli_cache first
      if (productId) {
        const { data: cachedProd } = await supabase
          .from("products")
          .select("meli_cache")
          .eq("id", productId)
          .maybeSingle();
        const cachedDesc = cachedProd?.meli_cache?.description;
        if (cachedDesc) {
          productContext += `\nDescripción del producto: ${cachedDesc}`;
        } else {
          // Fetch from MeLi API
          const descRes = await fetch(`https://api.mercadolibre.com/items/${q.item_id}/description`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (descRes.ok) {
            const descData = await descRes.json();
            if (descData?.plain_text) {
              productContext += `\nDescripción del producto: ${descData.plain_text}`;
            }
          }
        }
      }
    } catch (e) {
      console.error("Error fetching item description:", e);
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

  console.log(`Processing question ${meliQuestionId}: item_id=${q.item_id}, product_id=${productId}, buyer=${buyerNickname || q.from?.id}, productTitle=${productTitle}, hasCRM=${!!crmKnowledge}`);

  // Generate AI answer (CRM injected into system prompt, product data in user prompt)
  const productObj = product || null;
  const { answer, category, requires_human, requires_human_reason, confidence } = aiSuggestionsEnabled
    ? await generateAiAnswer(q.text, productContext, {
        aiTone,
        aiCustomInstructions,
        exclusionRules,
        buyerNickname,
        productTitle,
        productPrice: productObj?.price ?? null,
        crmKnowledge,
        businessKnowledge,
      })
    : { answer: "", category: "Otro", requires_human: false, requires_human_reason: "", confidence: 0 };

  // ─── Autopilot Decision Engine ───
  const outsideHours = isOutsideBusinessHours(businessHours);
  let autoAction: 'none' | 'suggest' | 'auto_reply' = 'suggest';
  let decisionReason = '';
  let finalStatus = 'pending';

  if (requires_human) {
    autoAction = 'suggest';
    finalStatus = 'needs_human';
    decisionReason = `requires_human: ${requires_human_reason}`;
  } else if (autopilotAfterHours && outsideHours && confidence >= confidenceThreshold && answer) {
    autoAction = 'auto_reply';
    finalStatus = 'queued_auto';
    decisionReason = `autopilot_after_hours: confidence=${confidence.toFixed(2)} >= ${confidenceThreshold}, outside_hours=true`;
  } else if (autopilotInHours && !outsideHours && confidence >= confidenceThreshold && answer) {
    autoAction = 'auto_reply';
    finalStatus = 'queued_auto';
    decisionReason = `autopilot_in_hours: confidence=${confidence.toFixed(2)} >= ${confidenceThreshold}, outside_hours=false`;
  } else if (legacyAutoReplyEnabled && legacyAutoReplyMode === 'always' && answer && !requires_human) {
    // Legacy compat: old "always" mode
    autoAction = 'auto_reply';
    finalStatus = 'queued_auto';
    decisionReason = `legacy_always: auto_reply_mode=always`;
  } else if (legacyAutoReplyEnabled && legacyAutoReplyMode === 'outside_business_hours' && outsideHours && answer && !requires_human) {
    // Legacy compat: old "outside_business_hours" mode
    autoAction = 'auto_reply';
    finalStatus = 'queued_auto';
    decisionReason = `legacy_outside_hours: auto_reply_mode=outside_business_hours, outside_hours=true`;
  } else {
    autoAction = answer ? 'suggest' : 'none';
    finalStatus = 'pending';
    decisionReason = `manual: confidence=${confidence.toFixed(2)}, threshold=${confidenceThreshold}, outside_hours=${outsideHours}`;
  }

  // Log AI_DECISION event
  await logEvent(supabase, companyId, "AI_DECISION", "question", meliQuestionId, {
    confidence,
    action: autoAction,
    reason: decisionReason,
    category,
    requires_human,
    outside_hours: outsideHours,
  });

  const baseInsert = {
    meli_question_id: meliQuestionId,
    company_id: companyId,
    product_id: productId,
    product_meli_id: q.item_id || null,
    question_text: q.text,
    buyer_id: q.from ? String(q.from.id) : null,
    buyer_nickname: buyerNickname,
    ai_suggested_answer: answer || null,
    ai_category: category || null,
    ai_confidence: confidence,
    ai_decision_reason: decisionReason,
    auto_action: autoAction,
    answered_by_ai: false,
    meli_status: q.status || null,
    meli_permalink: null as string | null,
    created_at: q.date_created || new Date().toISOString(),
  };

  if (autoAction === 'auto_reply' && answer) {
    const published = await autoPublishMeliAnswer(accessToken, meliQuestionId, answer);

    if (published) {
      await logEvent(supabase, companyId, "AUTO_REPLY_SENT", "question", meliQuestionId, { answer_length: answer.length, confidence });

      const { error: insertErr } = await supabase.from("questions").insert({
        ...baseInsert,
        status: "auto_published",
        final_answer: answer,
        answered_at: new Date().toISOString(),
        answered_by_ai: true,
        requires_human: false,
        requires_human_reason: null,
      });

      if (insertErr) {
        console.error("Error inserting question:", insertErr);
        return false;
      }
      return true;
    } else {
      // Failsafe: publish failed → needs_human
      await logEvent(supabase, companyId, "ERROR", "question", meliQuestionId, { error: "auto_publish_failed", fallback: "needs_human" });

      const { error: insertErr } = await supabase.from("questions").insert({
        ...baseInsert,
        status: "needs_human",
        requires_human: true,
        requires_human_reason: "Auto-publicación falló, requiere revisión manual",
      });

      if (insertErr) {
        console.error("Error inserting question:", insertErr);
        return false;
      }
      return true;
    }
  }

  // Default: insert with determined status
  const { error: insertErr } = await supabase.from("questions").insert({
    ...baseInsert,
    status: finalStatus,
    requires_human: requires_human || finalStatus === 'needs_human',
    requires_human_reason: requires_human_reason || null,
  });

  if (insertErr) {
    console.error("Error inserting question:", insertErr);
    return false;
  }

  // Send notification for priority questions
  if (requires_human || finalStatus === 'needs_human') {
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      await fetch(`${SUPABASE_URL}/functions/v1/notify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          type: "priority_question",
          company_id: companyId,
          title: "Pregunta prioritaria",
          message: q.text?.slice(0, 100) || "Nueva pregunta requiere atención",
          link: "/priority",
        }),
      });
    } catch (e) {
      console.error("Error sending priority notification:", e);
    }
  }

  return true;
}
