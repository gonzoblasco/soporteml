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

    // Get user company
    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: "No company" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch product (must belong to user's company)
    const { data: product, error: prodErr } = await supabase
      .from("products")
      .select("*")
      .eq("id", product_id)
      .eq("company_id", profile.company_id)
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
    if (!force_refresh && product.meli_cache_fetched_at) {
      const cacheAge = Date.now() - new Date(product.meli_cache_fetched_at).getTime();
      if (cacheAge < CACHE_TTL_MS && product.meli_cache) {
        return new Response(JSON.stringify({
          enriched: false,
          reason: "cache_fresh",
          cache_age_hours: Math.round(cacheAge / 3600000),
          product_id,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get MeLi token
    const { data: tokenRow } = await supabase
      .from("meli_tokens")
      .select("*")
      .eq("company_id", profile.company_id)
      .maybeSingle();

    const headers: Record<string, string> = {};
    if (tokenRow) {
      try {
        const appId = Deno.env.get("MELI_APP_ID")!;
        const secretKey = Deno.env.get("MELI_SECRET_KEY")!;
        const accessToken = await refreshTokenIfNeeded(supabase, tokenRow as TokenRow, appId, secretKey);
        headers.Authorization = `Bearer ${accessToken}`;
      } catch (e) {
        console.warn("Token refresh failed, trying public fetch:", e.message);
      }
    }

    // Fetch from MeLi API
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

    // Build cache object
    const meliCache = {
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
          meliCache.category_name = catData.name ?? null;
        }
      } catch { /* ignore */ }
    }

    // MERGE: update product fields but NEVER overwrite human knowledge
    const updatePayload: Record<string, unknown> = {
      meli_cache: meliCache,
      meli_cache_fetched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Safe fields: always update from MeLi (non-human-knowledge)
    if (!product.permalink && meliCache.permalink) updatePayload.permalink = meliCache.permalink;
    if (!product.price && meliCache.price) updatePayload.price = meliCache.price;
    if (!product.meli_category_id && meliCache.category_id) updatePayload.meli_category_id = meliCache.category_id;
    if (!product.meli_category_name && meliCache.category_name) updatePayload.meli_category_name = meliCache.category_name;

    // NEVER overwrite: support_summary, key_points, faq_bullets, do_not_say, shipping_notes, returns_notes, warranty_notes

    await supabase
      .from("products")
      .update(updatePayload)
      .eq("id", product_id);

    return new Response(JSON.stringify({
      enriched: true,
      product_id,
      fields_updated: Object.keys(updatePayload).filter(k => k !== "meli_cache" && k !== "meli_cache_fetched_at" && k !== "updated_at"),
      cache_keys: Object.keys(meliCache),
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
