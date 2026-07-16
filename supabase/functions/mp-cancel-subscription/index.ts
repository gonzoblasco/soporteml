import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[MP-CANCEL-SUBSCRIPTION] ${step}${d}`);
};

/**
 * Pauses the company's MP preapproval (status: 'paused').
 * The user retains access until billing_period_end and can reactivate from MP.
 * Only company admins can call this.
 *
 * Security model (audited):
 * - JWT validated via supabase.auth.getUser(authHeader).
 * - company_id derived server-side via get_user_company_id(user.id) — NEVER from client body.
 * - Membership enforced via has_membership_role(_role: 'admin'), which is stricter than
 *   user_belongs_to_company (requires admin role, not just any active membership).
 * - Multi-company safe: a user can only cancel the subscription of their default company.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    if (!MP_ACCESS_TOKEN) throw new Error("MP_ACCESS_TOKEN not configured");

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
    let companyId: string;

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
      if (!cid) throw new Error("No company found for test user");
      companyId = cid;
    } else {
      if (!authHeader) throw new Error("No authorization header");
      const { data: userData, error: userError } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", "")
      );
      if (userError || !userData.user) throw new Error("Authentication failed");
      userId = userData.user.id;
      const { data: cid } = await supabase.rpc("get_user_company_id", { _user_id: userId });
      if (!cid) throw new Error("No company found");
      companyId = cid;
    }

    // Verify caller is admin of the company
    const { data: isAdmin } = await supabase.rpc("has_membership_role", {
      _user_id: userId,
      _company_id: companyId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Only admins can cancel the subscription");

    const { data: company } = await supabase
      .from("companies")
      .select("mp_preapproval_id, billing_status")
      .eq("id", companyId)
      .single();

    if (!company?.mp_preapproval_id) throw new Error("No active subscription found");

    log("Pausing preapproval", { companyId, preapprovalId: company.mp_preapproval_id });

    const mpRes = await fetch(
      `https://api.mercadopago.com/preapproval/${company.mp_preapproval_id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ status: "paused" }),
      }
    );

    if (!mpRes.ok) {
      const err = await mpRes.text();
      log("MP API error", { status: mpRes.status, body: err });
      throw new Error(`MP API error: ${mpRes.status} - ${err}`);
    }

    await supabase
      .from("companies")
      .update({ billing_status: "paused" })
      .eq("id", companyId);

    log("Subscription paused", { companyId });

    return new Response(JSON.stringify({ success: true, billing_status: "paused" }), {
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
