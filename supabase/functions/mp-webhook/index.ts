import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-signature, x-request-id",
};

const log = (step: string, details?: unknown) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[MP-WEBHOOK] ${step}${d}`);
};

/**
 * Validate Mercado Pago webhook signature.
 * MP sends: x-signature: ts=TIMESTAMP,v1=HMAC_HEX
 * Manifest to sign: id:DATA_ID;request-id:REQUEST_ID;ts:TIMESTAMP;
 * Secret: MP_WEBHOOK_SECRET
 */
async function verifyMpSignature(
  signatureHeader: string | null,
  requestId: string | null,
  dataId: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader || !secret) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, ...rest] = p.trim().split("=");
      return [k, rest.join("=")];
    })
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1 || !dataId) return false;

  const manifest = `id:${dataId};request-id:${requestId ?? ""};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex === v1;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN")!;
    const MP_WEBHOOK_SECRET = Deno.env.get("MP_WEBHOOK_SECRET");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const rawBody = await req.text();
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      log("Invalid JSON body");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("Received", { type: body.type, action: body.action, dataId: body.data?.id });

    // Validate HMAC signature
    if (MP_WEBHOOK_SECRET) {
      const ok = await verifyMpSignature(
        req.headers.get("x-signature"),
        req.headers.get("x-request-id"),
        String(body.data?.id ?? ""),
        MP_WEBHOOK_SECRET,
      );
      if (!ok) {
        log("Invalid signature - rejecting");
        return new Response(JSON.stringify({ error: "invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      log("WARN: MP_WEBHOOK_SECRET not configured, skipping signature check");
    }

    // Log event for debugging
    await supabase.from("mp_webhook_events").insert({
      event_type: body.type ?? "unknown",
      payload: body,
    });

    // Only process preapproval events
    if (body.type !== "subscription_preapproval") {
      log("Skipping non-preapproval event", { type: body.type });
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const preapprovalId = body.data?.id;
    if (!preapprovalId) {
      log("No preapproval id in payload");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpRes = await fetch(
      `https://api.mercadopago.com/preapproval/${preapprovalId}`,
      { headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` } }
    );

    if (!mpRes.ok) {
      log("Failed to fetch preapproval from MP", { status: mpRes.status });
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const preapproval = await mpRes.json();
    const companyId = preapproval.external_reference;
    const status = preapproval.status; // 'authorized' | 'paused' | 'cancelled' | 'pending'

    if (!companyId) {
      log("No external_reference in preapproval", { id: preapprovalId });
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updatePayload: Record<string, unknown> = {
      mp_preapproval_id: preapprovalId,
      billing_status: status,
    };

    if (status === "authorized") {
      updatePayload.plan = "base";
      updatePayload.billing_period_end = preapproval.next_payment_date ?? null;
    }

    await supabase.from("companies").update(updatePayload).eq("id", companyId);
    log("Updated company", { companyId, billing_status: status });

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    log("ERROR", { message: error instanceof Error ? error.message : String(error) });
    // Always 200 so MP doesn't retry forever
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
