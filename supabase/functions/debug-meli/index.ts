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
  const results: Record<string, any> = {};

  // 1. Fetch the question
  const qRes = await fetch(`https://api.mercadolibre.com/questions/13531654362`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  results.question_status = qRes.status;
  results.question_body = await qRes.json();

  // 2. Try fetching the item from the question
  const itemId = results.question_body?.item_id;
  if (itemId) {
    // Auth endpoint
    const itemRes1 = await fetch(`https://api.mercadolibre.com/items/${itemId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    results.item_auth_status = itemRes1.status;
    results.item_auth_body = await itemRes1.json();

    // Public endpoint  
    const itemRes2 = await fetch(`https://api.mercadolibre.com/items/${itemId}`);
    results.item_public_status = itemRes2.status;
    results.item_public_body = await itemRes2.json();
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
