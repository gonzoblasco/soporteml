import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { item_id } = await req.json();
    if (!item_id) {
      return new Response(JSON.stringify({ error: "item_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is authenticated
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

    // Verify token
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

    // Get user's company (via memberships)
    const { data: companyId } = await supabase.rpc("get_user_company_id", { _user_id: user.id });

    if (!companyId) {
      return new Response(JSON.stringify({ error: "No active membership found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tokenRow } = await supabase
      .from("meli_tokens")
      .select("access_token")
      .eq("company_id", companyId)
      .maybeSingle();

    // Fetch item data from MeLi (with auth if available, public otherwise)
    const headers: Record<string, string> = {};
    if (tokenRow?.access_token) {
      headers.Authorization = `Bearer ${tokenRow.access_token}`;
    }

    const [itemRes, descRes] = await Promise.all([
      fetch(`https://api.mercadolibre.com/items/${item_id}`, { headers }),
      fetch(`https://api.mercadolibre.com/items/${item_id}/description`, { headers }),
    ]);

    const itemData = itemRes.ok ? await itemRes.json() : null;
    const descData = descRes.ok ? await descRes.json() : null;

    return new Response(
      JSON.stringify({
        item: itemData,
        description: descData?.plain_text ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("meli-item-proxy error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
