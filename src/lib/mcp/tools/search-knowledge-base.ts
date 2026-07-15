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
  name: "search_knowledge_base",
  title: "Buscar en base de conocimiento",
  description:
    "Búsqueda semántica en la base de conocimiento (artículos indexados con embeddings) de la empresa del usuario. Devuelve los fragmentos más relevantes para la consulta.",
  inputSchema: {
    query: z.string().min(2).describe("Texto de búsqueda en lenguaje natural."),
    company_id: z.string().uuid().describe("ID de la empresa donde buscar."),
    limit: z.number().int().min(1).max(10).optional().describe("Máximo de fragmentos a devolver (por defecto 5)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, company_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.functions.invoke("kb-search", {
      body: { query, company_id, limit: limit ?? 5 },
    });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { results: data },
    };
  },
});