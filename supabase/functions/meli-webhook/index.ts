import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Optional shared-secret protection. Configure MELI_WEBHOOK_SECRET in env and append
  // `?secret=<token>` to the URL registered in Mercado Libre. When unset, we accept all
  // calls (back-compat) but log a warning so the operator can enable it.
  const expectedSecret = Deno.env.get("MELI_WEBHOOK_SECRET");
  if (expectedSecret) {
    const url = new URL(req.url);
    if (url.searchParams.get("secret") !== expectedSecret) {
      console.warn("[MELI-WEBHOOK] Rejected request with invalid/missing secret");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else {
    console.warn("[MELI-WEBHOOK] MELI_WEBHOOK_SECRET is not set; accepting unauthenticated webhook");
  }

  // MeLi sends GET for verification and POST for notifications
  if (req.method === "GET") {
    // Verification ping from MeLi during webhook setup
    return new Response("OK", {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();
    console.log("[MELI-WEBHOOK] Received:", JSON.stringify(body));

    const { topic, resource, user_id, application_id } = body;

    // MeLi sends topic: "questions" when a new question arrives
    if (topic === "questions" && resource) {
      console.log("[MELI-WEBHOOK] Question notification:", resource, "user_id:", user_id);

      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      // Fetch cron secret from vault via SECURITY DEFINER RPC
      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: cronSecret } = await admin.rpc("get_cron_secret");

      // Forward to sync-meli-questions with the specific resource
      const syncUrl = `${SUPABASE_URL}/functions/v1/sync-meli-questions`;
      const syncRes = await fetch(syncUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Cron-Secret": String(cronSecret ?? ""),
        },
        body: JSON.stringify({
          source: "cron",
          resource,
          meli_user_id: String(user_id),
        }),
      });

      console.log("[MELI-WEBHOOK] sync-meli-questions response:", syncRes.status);
    } else {
      console.log("[MELI-WEBHOOK] Ignored topic:", topic);
    }

    // Always respond 200 quickly so MeLi doesn't retry
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[MELI-WEBHOOK] Error:", err);
    // Still return 200 to prevent MeLi retries on parse errors
    return new Response(JSON.stringify({ received: true, error: "parse_error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
