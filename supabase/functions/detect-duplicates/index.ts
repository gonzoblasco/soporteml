import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DuplicateCandidate {
  product_id: string;
  title: string;
  match_level: "external_id" | "meli_item_id" | "sku" | "title_similarity";
  match_value: string;
  similarity?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product_id } = await req.json();
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

    // Fetch source product
    const { data: product } = await supabase
      .from("products")
      .select("id, title, meli_item_id, external_id, sku, source, company_id")
      .eq("id", product_id)
      .eq("company_id", profile.company_id)
      .single();

    if (!product) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const candidates: DuplicateCandidate[] = [];
    const seenIds = new Set<string>([product.id]);

    // Level 1: external_id match
    if (product.external_id) {
      const { data: matches } = await supabase
        .from("products")
        .select("id, title, external_id")
        .eq("company_id", profile.company_id)
        .eq("source", product.source)
        .eq("external_id", product.external_id)
        .neq("id", product.id)
        .eq("status", "active")
        .limit(10);

      for (const m of matches ?? []) {
        if (!seenIds.has(m.id)) {
          seenIds.add(m.id);
          candidates.push({
            product_id: m.id,
            title: m.title,
            match_level: "external_id",
            match_value: m.external_id!,
          });
        }
      }
    }

    // Level 2: meli_item_id match
    if (product.meli_item_id) {
      const { data: matches } = await supabase
        .from("products")
        .select("id, title, meli_item_id")
        .eq("company_id", profile.company_id)
        .eq("meli_item_id", product.meli_item_id)
        .neq("id", product.id)
        .eq("status", "active")
        .limit(10);

      for (const m of matches ?? []) {
        if (!seenIds.has(m.id)) {
          seenIds.add(m.id);
          candidates.push({
            product_id: m.id,
            title: m.title,
            match_level: "meli_item_id",
            match_value: m.meli_item_id!,
          });
        }
      }
    }

    // Level 3: SKU match
    if (product.sku) {
      const { data: matches } = await supabase
        .from("products")
        .select("id, title, sku")
        .eq("company_id", profile.company_id)
        .eq("sku", product.sku)
        .neq("id", product.id)
        .eq("status", "active")
        .limit(10);

      for (const m of matches ?? []) {
        if (!seenIds.has(m.id)) {
          seenIds.add(m.id);
          candidates.push({
            product_id: m.id,
            title: m.title,
            match_level: "sku",
            match_value: m.sku!,
          });
        }
      }
    }

    // Level 4: Title similarity via pg_trgm
    if (product.title && product.title.length > 5) {
      const { data: matches } = await supabase.rpc("find_similar_products", {
        _company_id: profile.company_id,
        _product_id: product.id,
        _title: product.title,
        _threshold: 0.6,
        _limit: 5,
      });

      for (const m of (matches ?? []) as any[]) {
        if (!seenIds.has(m.id)) {
          seenIds.add(m.id);
          candidates.push({
            product_id: m.id,
            title: m.title,
            match_level: "title_similarity",
            match_value: product.title,
            similarity: m.similarity,
          });
        }
      }
    }

    return new Response(JSON.stringify({
      product_id,
      duplicates: candidates,
      count: candidates.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("detect-duplicates error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
