/**
 * Shared MeLi token refresh logic with optimistic locking.
 * Prevents concurrent refresh races and protects refresh_token rotation.
 */

const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export interface TokenRow {
  id: string;
  company_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
  [key: string]: unknown;
}

export async function refreshTokenIfNeeded(
  supabase: any,
  tokenRow: TokenRow,
  appId: string,
  secretKey: string,
): Promise<string> {
  const now = Date.now();
  const expiresAt = new Date(tokenRow.expires_at).getTime();

  // Still valid for > 5 min → use as-is
  if (expiresAt - now > REFRESH_THRESHOLD_MS) {
    return tokenRow.access_token;
  }

  if (!tokenRow.refresh_token) {
    console.error("Token expired and no refresh_token for company:", tokenRow.company_id);
    throw new Error("Token expired and no refresh_token. Please reconnect MercadoLibre.");
  }

  const currentRefreshToken = tokenRow.refresh_token;
  console.log(`Refreshing MeLi token for company ${tokenRow.company_id} (expires in ${Math.round((expiresAt - now) / 1000)}s)`);

  const res = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: appId,
      client_secret: secretKey,
      refresh_token: currentRefreshToken,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Token refresh failed:", res.status, errText);
    throw new Error(`Token refresh failed: ${res.status} – ${errText}`);
  }

  const data = await res.json();
  const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
  const newRefreshToken = data.refresh_token ?? null;

  console.log("Token refreshed OK. New refresh_token:", newRefreshToken ? "RECEIVED" : "NOT_RECEIVED");

  // --- Optimistic lock: only update if refresh_token hasn't changed (no concurrent refresh) ---
  const updatePayload: Record<string, unknown> = {
    access_token: data.access_token,
    expires_at: newExpiresAt,
    updated_at: new Date().toISOString(),
  };

  // Always persist new refresh_token if MeLi returned one (rotation)
  if (newRefreshToken) {
    updatePayload.refresh_token = newRefreshToken;
  }

  const { data: updated, error: updateErr } = await supabase
    .from("meli_tokens")
    .update(updatePayload)
    .eq("id", tokenRow.id)
    .eq("refresh_token", currentRefreshToken) // optimistic lock
    .select("access_token")
    .maybeSingle();

  if (updateErr) {
    console.error("DB update error during token refresh:", updateErr);
    throw new Error("Failed to persist refreshed token");
  }

  if (!updated) {
    // Another process already refreshed → re-read the latest token
    console.log("Optimistic lock conflict: another process refreshed first. Re-reading DB...");
    const { data: freshRow, error: readErr } = await supabase
      .from("meli_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("id", tokenRow.id)
      .single();

    if (readErr || !freshRow) {
      throw new Error("Failed to re-read token after lock conflict");
    }

    // If the re-read token is also expired, retry once with the new refresh_token
    const freshExpires = new Date(freshRow.expires_at).getTime();
    if (freshExpires <= Date.now() && freshRow.refresh_token) {
      console.log("Re-read token is also expired. Retrying refresh with latest refresh_token...");
      return refreshTokenIfNeeded(
        supabase,
        { ...tokenRow, ...freshRow } as TokenRow,
        appId,
        secretKey,
      );
    }

    return freshRow.access_token;
  }

  return data.access_token;
}
