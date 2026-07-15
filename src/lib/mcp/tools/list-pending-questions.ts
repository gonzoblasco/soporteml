import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_pending_questions",
  title: "Listar preguntas pendientes",
  description:
    "Lista las preguntas de Mercado Libre pendientes de respuesta para las empresas del usuario autenticado. Devuelve id, texto, comprador, producto y borrador de IA si existe.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Máximo de preguntas a devolver (por defecto 20)."),
    company_id: z.string().uuid().optional().describe("Filtrar por empresa. Si se omite, incluye todas las empresas del usuario."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, company_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("questions")
      .select("id, company_id, product_id, question_text, buyer_nickname, status, ai_suggested_answer, ai_category, requires_human, created_at, products(title, meli_id)")
      .in("status", ["pending", "needs_human", "queued_auto"])
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (company_id) query = query.eq("company_id", company_id);
    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { questions: data ?? [] },
    };
  },
});