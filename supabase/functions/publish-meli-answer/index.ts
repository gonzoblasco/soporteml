import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function refreshTokenIfNeeded(
  supabase: any,
  tokenRow: any,
  appId: string,
  secretKey: string
): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(tokenRow.expires_at);

  if (expiresAt.getTime() - now.getTime() > 10 * 60 * 1000) {
    return tokenRow.access_token;
  }

  console.log("Refreshing MeLi token for company:", tokenRow.company_id);

  const res = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: appId,
      client_secret: secretKey,
      refresh_token: tokenRow.refresh_token,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Token refresh failed:", errText);
    throw new Error(`Token refresh failed: ${res.status}`);
  }

  const data = await res.json();
  const expiresAtNew = new Date(Date.now() + data.expires_in * 1000).toISOString();

  await supabase
    .from("meli_tokens")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: expiresAtNew,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tokenRow.id);

  return data.access_token;
}

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
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerUserId = claimsData.claims.sub;
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
