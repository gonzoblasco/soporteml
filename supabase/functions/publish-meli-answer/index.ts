import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { refreshTokenIfNeeded } from "../_shared/refreshMeliToken.ts";

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
    const MELI_APP_ID = Deno.env.get("MELI_APP_ID")!;
    const MELI_SECRET_KEY = Deno.env.get("MELI_SECRET_KEY")!;

    // Authenticate request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerUserId = user.id;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { question_id, answer } = await req.json();

    if (!question_id || !answer) {
      return new Response(JSON.stringify({ error: "question_id and answer are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the question
    const { data: question, error: qErr } = await supabase
      .from("questions")
      .select("*")
      .eq("id", question_id)
      .single();

    if (qErr || !question) {
      return new Response(JSON.stringify({ error: "Question not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user belongs to the question's company
    const { data: userCompanyId } = await supabase.rpc('get_user_company_id', { _user_id: callerUserId });
    if (!userCompanyId || userCompanyId !== question.company_id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get MeLi token for the company
    const { data: tokenRow, error: tokErr } = await supabase
      .from("meli_tokens")
      .select("*")
      .eq("company_id", question.company_id)
      .single();

    if (tokErr || !tokenRow) {
      return new Response(JSON.stringify({ error: "No MeLi token found for this company" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = await refreshTokenIfNeeded(supabase, tokenRow, MELI_APP_ID, MELI_SECRET_KEY);

    // Post answer to MercadoLibre
    const meliRes = await fetch(
      `https://api.mercadolibre.com/answers`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          question_id: Number(question.meli_question_id),
          text: answer,
        }),
      }
    );

    const meliBody = await meliRes.text();
    console.log("MeLi answer response:", meliRes.status, meliBody);

    if (!meliRes.ok) {
      // Update question status to error
      await supabase
        .from("questions")
        .update({ status: "error" })
        .eq("id", question_id);

      return new Response(
        JSON.stringify({ error: "MeLi API error", details: meliBody }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update question in DB
    const updatePayload: Record<string, unknown> = {
      final_answer: answer,
      status: "published",
      answered_at: new Date().toISOString(),
      answered_by: callerUserId,
    };
    await supabase
      .from("questions")
      .update(updatePayload)
      .eq("id", question_id);

    return new Response(
      JSON.stringify({ ok: true, message: "Answer published to MercadoLibre" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Publish error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
