import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state"); // company_id

    console.log("OAuth callback triggered with code:", code ? "YES" : "NO", "state:", state);

    if (!code || !state) {
      console.error("Missing code or state in callback URL");
      return new Response("Missing code or state (company_id)", { status: 400 });
    }

    // Basic UUID validation for state (company_id)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(state)) {
      console.error("Invalid company_id format (state):", state);
      return new Response("Invalid company_id format", { status: 400 });
    }

    const MELI_APP_ID = Deno.env.get("MELI_APP_ID");
    const MELI_SECRET_KEY = Deno.env.get("MELI_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, ""); // Ensure no trailing slash
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!MELI_APP_ID || !MELI_SECRET_KEY || !SUPABASE_URL) {
      console.error("Missing configuration:", { MELI_APP_ID: !!MELI_APP_ID, MELI_SECRET_KEY: !!MELI_SECRET_KEY, SUPABASE_URL: !!SUPABASE_URL });
      throw new Error("MeLi credentials or Supabase URL not configured");
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/meli-oauth-callback`;
    console.log("Using redirect_uri:", redirectUri);

    // Exchange code for tokens
    console.log("Exchanging code for tokens with MeLi...");
    const tokenRes = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: MELI_APP_ID,
        client_secret: MELI_SECRET_KEY,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("MeLi token exchange failed. Status:", tokenRes.status, "Body:", errBody);
      throw new Error(`Token exchange failed: ${tokenRes.status}`);
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token = null, expires_in, user_id: meli_user_id } = tokenData;

    console.log("Token exchange successful for MeLi User ID:", meli_user_id);

    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Store tokens using service role
    console.log("Storing tokens in database for company:", state);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error: upsertError } = await supabase
      .from("meli_tokens")
      .upsert(
        {
          company_id: state,
          access_token,
          refresh_token,
          meli_user_id: String(meli_user_id),
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id" }
      );

    if (upsertError) {
      console.error("Failed to store tokens in 'meli_tokens' table:", upsertError);
      throw new Error("Failed to store tokens in database");
    }

    console.log("Tokens stored successfully.");

    // Redirect to app with success
    return new Response(
      `<html><head><meta charset="UTF-8"></head><body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
        <h2>✅ MercadoLibre conectado exitosamente</h2>
        <p>Ya podés cerrar esta ventana y volver a la aplicación.</p>
        <script>setTimeout(() => window.close(), 3000);</script>
      </body></html>`,
      { headers: { "Content-Type": "text/html" }, status: 200 }
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    return new Response(
      `<html><body><h2>❌ Error al conectar MercadoLibre</h2><p>${error.message}</p></body></html>`,
      { headers: { "Content-Type": "text/html" }, status: 500 }
    );
  }
});
