import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { refreshTokenIfNeeded, type TokenRow } from "../_shared/refreshMeliToken.ts";

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

    // Read full token row for refresh logic
    const { data: tokenRow } = await supabase
      .from("meli_tokens")
      .select("id, company_id, access_token, refresh_token, expires_at")
      .eq("company_id", companyId)
      .maybeSingle();

    // Try to get a valid access token (with auto-refresh)
    let accessToken: string | null = null;
    let tokenExpired = false;

    if (tokenRow) {
      try {
        const appId = Deno.env.get("MELI_APP_ID") || "";
        const secretKey = Deno.env.get("MELI_SECRET_KEY") || "";
        accessToken = await refreshTokenIfNeeded(
          supabase,
          tokenRow as TokenRow,
          appId,
          secretKey,
        );
      } catch (refreshErr) {
        console.warn("Token refresh failed, will try public fetch:", refreshErr.message);
        tokenExpired = true;
      }
    }

    // Fetch item data from MeLi
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    let [itemRes, descRes] = await Promise.all([
      fetch(`https://api.mercadolibre.com/items/${item_id}`, { headers }),
      fetch(`https://api.mercadolibre.com/items/${item_id}/description`, { headers }),
    ]);

    // If authenticated request got 401, retry without auth (public fallback)
    if (itemRes.status === 401 && accessToken) {
      console.log("MeLi returned 401 with token, retrying public fetch...");
      tokenExpired = true;
      [itemRes, descRes] = await Promise.all([
        fetch(`https://api.mercadolibre.com/items/${item_id}`),
        fetch(`https://api.mercadolibre.com/items/${item_id}/description`),
      ]);
    }

    const itemData = itemRes.ok ? await itemRes.json() : null;
    const descData = descRes.ok ? await descRes.json() : null;

    const response: Record<string, unknown> = {
      item: itemData,
      description: descData?.plain_text ?? null,
    };

    if (!itemData) {
      response.item_error = {
        status: itemRes.status,
        reason: itemRes.status === 404 ? 'not_found' :
                itemRes.status === 403 ? 'forbidden' :
                itemRes.status === 401 ? 'token_expired' : 'api_error',
      };
    }

    // Flag token_expired even if public fallback succeeded
    if (tokenExpired) {
      response.token_expired = true;
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("meli-item-proxy error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
