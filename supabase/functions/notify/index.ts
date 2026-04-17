import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Called only from trusted EFs with service role.
    // The Authorization header MUST equal the service role key — no client JWTs accepted.
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (token !== SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { type, company_id, title, message, link } = await req.json();

    if (!type || !company_id || !title) {
      return new Response(JSON.stringify({ error: "Missing required fields: type, company_id, title" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all users in this company
    const { data: profiles, error: profilesErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("company_id", company_id);

    if (profilesErr || !profiles?.length) {
      console.log("No users found for company:", company_id, profilesErr);
      return new Response(JSON.stringify({ created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a notification for each user
    const rows = profiles.map((p) => ({
      user_id: p.id,
      company_id,
      type,
      title,
      message: message || null,
      link: link || null,
    }));

    const { error: insertErr, data } = await supabase
      .from("notifications")
      .insert(rows)
      .select("id");

    if (insertErr) {
      console.error("Error inserting notifications:", insertErr);
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Created ${data?.length ?? 0} notifications for company ${company_id}`);

    return new Response(JSON.stringify({ created: data?.length ?? 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Notify error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
