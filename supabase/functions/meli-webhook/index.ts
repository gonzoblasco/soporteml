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
      const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

      // Forward to sync-meli-questions with the specific resource
      const syncUrl = `${SUPABASE_URL}/functions/v1/sync-meli-questions`;
      const syncRes = await fetch(syncUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
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
