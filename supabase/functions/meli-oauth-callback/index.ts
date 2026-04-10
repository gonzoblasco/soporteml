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
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const rawState = url.searchParams.get("state"); // company_id|code_verifier

    console.log("OAuth callback triggered with code:", code ? "YES" : "NO", "rawState length:", rawState?.length);

    if (!code || !rawState) {
      console.error("Missing code or state in callback URL");
      return new Response("Missing code or state", { status: 400 });
    }

    // Validate total state length to prevent abuse
    if (rawState.length > 200) {
      console.error("State parameter too long:", rawState.length);
      return new Response("Invalid state parameter", { status: 400 });
    }

    // Parse state: "company_id|code_verifier" or legacy "company_id"
    const parts = rawState.split("|");
    if (parts.length > 2) {
      console.error("Invalid state format: too many segments");
      return new Response("Invalid state format", { status: 400 });
    }

    const companyId = parts[0];
    const codeVerifier = parts.length === 2 ? parts[1] : null;

    console.log("Parsed companyId:", companyId, "| code_verifier present:", !!codeVerifier);

    // UUID validation for company_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(companyId)) {
      console.error("Invalid company_id format:", companyId);
      return new Response("Invalid company_id format", { status: 400 });
    }

    // Validate code_verifier format (PKCE spec: 43-128 chars, base64url)
    if (codeVerifier && !/^[A-Za-z0-9_-]{43,128}$/.test(codeVerifier)) {
      console.error("Invalid code_verifier format");
      return new Response("Invalid code_verifier format", { status: 400 });
    }

    const MELI_APP_ID = Deno.env.get("MELI_APP_ID");
    const MELI_SECRET_KEY = Deno.env.get("MELI_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!MELI_APP_ID || !MELI_SECRET_KEY || !SUPABASE_URL) {
      console.error("Missing configuration:", { MELI_APP_ID: !!MELI_APP_ID, MELI_SECRET_KEY: !!MELI_SECRET_KEY, SUPABASE_URL: !!SUPABASE_URL });
      throw new Error("MeLi credentials or Supabase URL not configured");
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/meli-oauth-callback`;
    console.log("Using redirect_uri:", redirectUri);

    // Build token exchange body with PKCE code_verifier if available
    const tokenBody: Record<string, string> = {
      grant_type: "authorization_code",
      client_id: MELI_APP_ID,
      client_secret: MELI_SECRET_KEY,
      code,
      redirect_uri: redirectUri,
    };
    if (codeVerifier) {
      tokenBody.code_verifier = codeVerifier;
      console.log("Including code_verifier in token exchange (PKCE)");
    }

    // Exchange code for tokens
    console.log("Exchanging code for tokens with MeLi...");
    const tokenRes = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: new URLSearchParams(tokenBody),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error("MeLi token exchange failed. Status:", tokenRes.status, "Body:", errBody);
      throw new Error(`Token exchange failed: ${tokenRes.status}`);
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_in, user_id: meli_user_id } = tokenData;

    console.log("Token exchange successful for MeLi User ID:", meli_user_id,
      "| refresh_token:", refresh_token ? "RECEIVED" : "NOT_RECEIVED",
      "| expires_in:", expires_in);

    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Store tokens using service role
    console.log("Storing tokens in database for company:", companyId);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build upsert payload – protect existing refresh_token if MeLi didn't return one
    const upsertPayload: Record<string, unknown> = {
      company_id: companyId,
      access_token,
      meli_user_id: String(meli_user_id),
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    };

    // Only overwrite refresh_token if we actually received one
    if (refresh_token) {
      upsertPayload.refresh_token = refresh_token;
    }

    // Check if row exists to decide insert vs update (to avoid nullifying refresh_token on upsert)
    const { data: existingToken } = await supabase
      .from("meli_tokens")
      .select("id, refresh_token")
      .eq("company_id", companyId)
      .maybeSingle();

    let upsertError;
    if (existingToken) {
      // Update existing – never null out refresh_token
      const { error } = await supabase
        .from("meli_tokens")
        .update(upsertPayload)
        .eq("id", existingToken.id);
      upsertError = error;
    } else {
      // First time insert
      upsertPayload.refresh_token = refresh_token ?? null;
      const { error } = await supabase
        .from("meli_tokens")
        .insert(upsertPayload);
      upsertError = error;
    }

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
        <script>
          try { window.opener?.postMessage({ type: "meli_oauth_success" }, "*"); } catch(e) {}
          setTimeout(() => window.close(), 2000);
        </script>
      </body></html>`,
      { headers: { "Content-Type": "text/html" }, status: 200 }
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    return new Response(
      `<html><body><h2>❌ Error al conectar MercadoLibre</h2><p>Ocurrió un error inesperado. Por favor intentá de nuevo.</p></body></html>`,
      { headers: { "Content-Type": "text/html" }, status: 500 }
    );
  }
});
