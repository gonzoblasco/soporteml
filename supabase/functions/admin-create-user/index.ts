import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_BASE_PRICE_ID = "price_1T7faRHxJMYe1KhU6WFMGZBE";

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
    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");

    logStep("Caller authenticated", { userId: userData.user.id });

    // Verify super admin
    const { data: isSA } = await supabaseAdmin.rpc("is_super_admin");
    // Since we're using service role, we need to check manually
    if (userData.user.email !== "gonzoblasco@icloud.com") {
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

    // 1. Create user with auto-confirmed email
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

    // 2. Add company membership if requested
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

    // 3. Create Stripe subscription if plan requested
    if (plan === "base") {
      logStep("Creating Stripe subscription for Plan Base");
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

      // Check if customer exists
      const customers = await stripe.customers.list({ email, limit: 1 });
      let customerId: string;

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Existing Stripe customer found", { customerId });
      } else {
        const customer = await stripe.customers.create({
          email,
          name: full_name,
          metadata: { supabase_user_id: newUserId },
        });
        customerId = customer.id;
        logStep("Stripe customer created", { customerId });
      }

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: PLAN_BASE_PRICE_ID }],
        payment_behavior: "default_incomplete",
        metadata: { supabase_user_id: newUserId },
      });
      logStep("Subscription created", { subscriptionId: subscription.id, status: subscription.status });
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
