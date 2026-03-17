export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export async function logEvent(
  supabase: any,
  companyId: string,
  type: string,
  entityType?: string,
  entityId?: string,
  payload: Record<string, unknown> = {}
) {
  try {
    await supabase.from("events").insert({
      company_id: companyId,
      type,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      payload,
    });
  } catch (e) {
    console.error("Event log error:", e);
  }
}
