// SLA Breach Notifier
// Cron-driven. Scans companies with sla_escalation_enabled=true and at least one
// alert email configured. For each pending question past its SLA target where
// sla_alert_sent_at IS NULL, sends an email via Resend and marks the alert sent.
//
// Invoked by pg_cron every 5 minutes with body {"source":"cron"} and
// X-Cron-Secret header. Uses service-role to bypass RLS.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const CRON_SECRET = Deno.env.get("CRON_SECRET");

const FROM = "SoporteML <alertas@notify.soporteml.com>";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Lightweight auth: accept cron-secret header OR JSON body {source:"cron"}
  // (matches pattern used by sync-meli-questions).
  let body: any = {};
  try { body = await req.json(); } catch { /* noop */ }
  const headerSecret = req.headers.get("X-Cron-Secret");
  const isCron = body?.source === "cron" || (CRON_SECRET && headerSecret === CRON_SECRET);
  if (!isCron) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Companies with escalation enabled + at least one alert email
  const { data: settings, error: sErr } = await supabase
    .from("company_settings")
    .select("company_id, sla_target_minutes, sla_alert_emails")
    .eq("sla_escalation_enabled", true);

  if (sErr) {
    return new Response(JSON.stringify({ error: sErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let totalSent = 0;
  const perCompany: Record<string, number> = {};

  for (const s of settings ?? []) {
    const emails: string[] = Array.isArray(s.sla_alert_emails) ? s.sla_alert_emails : [];
    if (emails.length === 0) continue;
    const target = s.sla_target_minutes ?? 60;
    const cutoff = new Date(Date.now() - target * 60_000).toISOString();

    const { data: companyRow } = await supabase
      .from("companies").select("name").eq("id", s.company_id).maybeSingle();
    const companyName = companyRow?.name ?? "tu empresa";

    const { data: breached } = await supabase
      .from("questions")
      .select("id, text, buyer_nickname, meli_question_id, created_at, product_id")
      .eq("company_id", s.company_id)
      .eq("status", "pending")
      .is("answered_at", null)
      .is("sla_alert_sent_at", null)
      .lte("created_at", cutoff)
      .order("created_at", { ascending: true })
      .limit(50);

    if (!breached || breached.length === 0) continue;

    const rows = breached.map((q) => {
      const mins = Math.round((Date.now() - new Date(q.created_at).getTime()) / 60_000);
      const text = (q.text || "").slice(0, 180);
      return `<tr><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(q.buyer_nickname || "—")}</td><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(text)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;color:#b91c1c;font-weight:600">${mins} min</td></tr>`;
    }).join("");

    const html = `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#ffffff;color:#0f172a">
        <h2 style="margin:0 0 8px 0;font-size:18px">⚠️ SLA vencido en ${escapeHtml(companyName)}</h2>
        <p style="margin:0 0 16px 0;color:#475569;font-size:14px">
          ${breached.length} pregunta${breached.length === 1 ? "" : "s"} superaron el objetivo de ${target} min y siguen sin responder.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:#f8fafc"><th style="padding:8px;text-align:left">Comprador</th><th style="padding:8px;text-align:left">Pregunta</th><th style="padding:8px;text-align:right">Espera</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin:20px 0 0 0;font-size:13px">
          <a href="https://soporteml.com/inbox" style="background:#eab308;color:#0f172a;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600">Abrir Inbox</a>
        </p>
        <p style="margin:24px 0 0 0;color:#94a3b8;font-size:11px">Podés desactivar estas alertas en Ajustes → Operación → SLA.</p>
      </div>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: FROM,
        to: emails,
        subject: `[SoporteML] ${breached.length} pregunta${breached.length === 1 ? "" : "s"} vencida${breached.length === 1 ? "" : "s"} — ${companyName}`,
        html,
      }),
    });

    if (!resendRes.ok) {
      console.error("Resend error", s.company_id, resendRes.status, await resendRes.text());
      continue;
    }

    const ids = breached.map((q) => q.id);
    const { error: upErr } = await supabase
      .from("questions")
      .update({ sla_alert_sent_at: new Date().toISOString() })
      .in("id", ids);
    if (upErr) console.error("Mark sent error", s.company_id, upErr.message);

    perCompany[s.company_id] = breached.length;
    totalSent += breached.length;
  }

  return new Response(JSON.stringify({ ok: true, totalSent, perCompany }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}