import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[MP-CHECK-SUBSCRIPTION] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const MP_ACCESS_TOKEN = ***"MP_ACCESS_TOKEN");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Auth: JWT o X-Test-Secret
    const testSecret = Deno.env.get("MP_TEST_SECRET");
    const authHeader = req.headers.get("Authorization");
    const testHeader = req.headers.get("X-Test-Secret");

    let userId: string;
    let companyId: string | null;

    if (testSecret && testHeader === testSecret) {
      log("Test mode: using X-Test-Secret");
      const { data: users } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", "gonzoblasco@gmail.com")
        .single();
      if (!users) throw new Error("Test user not found");
      userId = users.id;
      const { data: cid } = await supabase.rpc("get_user_company_id", { _user_id: userId });
      companyId = cid;
    } else {
      if (!authHeader) throw new Error("No authorization header");
      const { data: userData, error: userError } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", "")
      );
      if (userError || !userData.user) throw new Error("Authentication failed");
      userId = userData.user.id;
      const { data: cid } = await supabase.rpc("get_user_company_id", {
        _user_id: userId,
      });
      companyId = cid;
    }

    if (!companyId) {
      return new Response(JSON.stringify({
        subscribed: false,
        plan: "free",
        billing_status: "free",
        billing_period_end: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: company } = await supabase
      .from("companies")
      .select("billing_status, plan, billing_period_end, mp_preapproval_id")
      .eq("id", companyId)
      .single();

    let billing_status = company?.billing_status ?? "free";
    let plan = company?.plan ?? "free";
    let billing_period_end = company?.billing_period_end ?? null;

    if (company?.mp_preapproval_id && MP_ACCESS_TOKEN) {
      const mpRes = await fetch(
        `https://api.mercadopago.com/preapproval/${company.mp_preapproval_id}`,
        { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } }
      );

      if (mpRes.ok) {
        const mpData = await mpRes.json();
        const isActive = mpData.status === "authorized";
        log("MP status", { id: mpData.id, status: mpData.status, dbStatus: company.billing_status });

        if (isActive && company.billing_status !== "active") {
          await supabase.from("companies").update({
            billing_status: "active",
            plan: "base",
            billing_period_end: mpData.next_payment_date ?? null,
          }).eq("id", companyId);
          billing_status = "active";
          plan = "base";
          billing_period_end = mpData.next_payment_date ?? null;
        } else if (!isActive && company.billing_status === "active") {
          await supabase.from("companies").update({
            billing_status: mpData.status,
          }).eq("id", companyId);
          billing_status = mpData.status;
        }
      } else {
        log("MP fetch failed", { status: mpRes.status });
      }
    }

    return new Response(JSON.stringify({
      subscribed: billing_status === "active",
      plan,
      billing_status,
      billing_period_end,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});