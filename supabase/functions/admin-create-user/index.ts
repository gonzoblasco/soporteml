import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ADMIN-CREATE-USER] ${step}${d}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    logStep("Caller authenticated", { userId: userData.user.id });

    // Verify super-admin status via the canonical RPC, executed in the caller's auth context
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );
    const { data: isSuperAdmin, error: superErr } = await callerClient.rpc("is_super_admin");
    if (superErr) throw new Error(`Super admin check failed: ${superErr.message}`);
    if (!isSuperAdmin) {
      throw new Error("Unauthorized: super admin access required");
    }
    logStep("Super admin verified");

    const body = await req.json();
    const { email, password, full_name, company_id, role, plan } = body;

    if (!email || !password || !full_name) {
      throw new Error("Missing required fields: email, password, full_name");
    }
    if (password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    logStep("Creating user", { email, full_name });
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) throw new Error(`Failed to create user: ${createError.message}`);
    if (!newUser.user) throw new Error("User creation returned no user");

    const newUserId = newUser.user.id;
    logStep("User created", { newUserId });

    if (company_id && role) {
      logStep("Adding membership", { company_id, role });
      const { error: memError } = await supabaseAdmin.rpc("add_company_membership", {
        _user_id: newUserId,
        _company_id: company_id,
        _role: role,
      });
      if (memError) {
        logStep("Membership error (non-fatal)", { error: memError.message });
      } else {
        logStep("Membership added");
      }
    }

    // If plan === "base", mark company as paid in DB.
    // The actual MP preapproval still needs to be created by the user from Settings.
    if (plan === "base" && company_id) {
      logStep("Marking company plan as base (manual override)");
      const { error: planError } = await supabaseAdmin
        .from("companies")
        .update({ plan: "base", billing_status: "active" })
        .eq("id", company_id);
      if (planError) {
        logStep("Plan update error (non-fatal)", { error: planError.message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, user_id: newUserId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(
      JSON.stringify({ error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
