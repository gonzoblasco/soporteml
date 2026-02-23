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

    if (!code || !state) {
      return new Response("Missing code or state (company_id)", { status: 400 });
    }

    const MELI_APP_ID = Deno.env.get("MELI_APP_ID");
    const MELI_SECRET_KEY = Deno.env.get("MELI_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!MELI_APP_ID || !MELI_SECRET_KEY) {
      throw new Error("MeLi credentials not configured");
    }

    // Exchange code for tokens
    const tokenRes = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: MELI_APP_ID,
        client_secret: MELI_SECRET_KEY,
        code,
        redirect_uri: `${SUPABASE_URL}/functions/v1/meli-oauth-callback`,
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("MeLi token exchange failed:", errBody);
      throw new Error(`Token exchange failed: ${tokenRes.status}`);
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_in, user_id: meli_user_id } = tokenData;

    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Store tokens using service role
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
      console.error("Failed to store tokens:", upsertError);
      throw new Error("Failed to store tokens");
    }

    // Redirect to app with success
    return new Response(
      `<html><body><h2>✅ MercadoLibre conectado exitosamente</h2><p>Podés cerrar esta ventana.</p><script>window.close();</script></body></html>`,
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
