import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: tokenRow } = await supabase
    .from("meli_tokens")
    .select("*")
    .limit(1)
    .single();

  if (!tokenRow) {
    return new Response(JSON.stringify({ error: "No token found" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const accessToken = tokenRow.access_token;
  const MELI_APP_ID = Deno.env.get("MELI_APP_ID");
  const results: Record<string, any> = {};

  // 1. Check grants & scopes for this app
  if (MELI_APP_ID) {
    const grantsRes = await fetch(
      `https://api.mercadolibre.com/applications/${MELI_APP_ID}/grants`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    results.grants_status = grantsRes.status;
    results.grants_body = await grantsRes.json();
  } else {
    results.grants_error = "MELI_APP_ID secret not configured";
  }

  // 2. Token info from DB
  results.token_info = {
    meli_user_id: tokenRow.meli_user_id,
    expires_at: tokenRow.expires_at,
    has_refresh_token: !!tokenRow.refresh_token,
    updated_at: tokenRow.updated_at,
  };

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
