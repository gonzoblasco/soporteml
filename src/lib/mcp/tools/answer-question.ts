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
  name: "answer_question",
  title: "Responder pregunta en Mercado Libre",
  description:
    "Publica una respuesta en Mercado Libre para la pregunta indicada, en nombre del usuario autenticado. Es una acción irreversible: la respuesta queda visible públicamente en la publicación.",
  inputSchema: {
    question_id: z.string().uuid().describe("ID interno (uuid) de la pregunta a responder."),
    answer_text: z.string().min(1).max(2000).describe("Texto de la respuesta (máx. 2000 caracteres). Debe ser claro y respetuoso."),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  handler: async ({ question_id, answer_text }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "No autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.functions.invoke("publish-meli-answer", {
      body: { question_id, answer_text, source: "mcp" },
    });
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? { ok: true }, null, 2) }],
      structuredContent: { result: data },
    };
  },
});