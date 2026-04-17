import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[MP-CREATE-SUBSCRIPTION] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    const MP_PREAPPROVAL_PLAN_ID = Deno.env.get("MP_PREAPPROVAL_PLAN_ID");
    if (!MP_ACCESS_TOKEN || !MP_PREAPPROVAL_PLAN_ID) {
      throw new Error("MP credentials not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const { data: userData, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !userData.user) throw new Error("Authentication failed");

    const userId = userData.user.id;
    // Security: company_id is derived server-side from the authenticated user's default company.
    // The client never supplies company_id, so user_belongs_to_company is implicit (get_user_company_id
    // only returns a company the user is an active member of). Safe for current single-company-per-action flow.
    const { data: companyId } = await supabase.rpc("get_user_company_id", { _user_id: userId });
    if (!companyId) throw new Error("No company found");

    const { data: company } = await supabase
      .from("companies")
      .select("name, mp_preapproval_id, billing_status")
      .eq("id", companyId)
      .single();

    if (company?.billing_status === "active" && company?.mp_preapproval_id) {
      log("Already subscribed", { companyId });
      return new Response(JSON.stringify({ already_subscribed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") || "https://soporteml.lovable.app";

    log("Creating preapproval", { companyId, email: userData.user.email });
    const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        preapproval_plan_id: MP_PREAPPROVAL_PLAN_ID,
        reason: "SoporteML Plan Base",
        external_reference: companyId,
        payer_email: userData.user.email,
        back_url: `${origin}/settings?billing=success`,
      }),
    });

    if (!mpRes.ok) {
      const err = await mpRes.text();
      log("MP API error", { status: mpRes.status, body: err });
      throw new Error(`MP API error: ${mpRes.status} - ${err}`);
    }

    const mpData = await mpRes.json();
    log("Preapproval created", { id: mpData.id, status: mpData.status });

    await supabase
      .from("companies")
      .update({ mp_preapproval_id: mpData.id })
      .eq("id", companyId);

    return new Response(JSON.stringify({ checkout_url: mpData.init_point }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
