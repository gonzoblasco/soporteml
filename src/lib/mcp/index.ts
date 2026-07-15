import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listPendingQuestions from "./tools/list-pending-questions";
import getQuestion from "./tools/get-question";
import answerQuestion from "./tools/answer-question";
import searchKnowledgeBase from "./tools/search-knowledge-base";
import listCompanies from "./tools/list-companies";

// The OAuth issuer must be the direct Supabase host, built from the project ref
// (SUPABASE_URL can be the .lovable.cloud proxy, which mcp-js rejects).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "soporteml-mcp",
  title: "SoporteML",
  version: "0.1.0",
  instructions:
    "Herramientas de SoporteML para gestionar preguntas de Mercado Libre. Usá list_my_companies para descubrir el company_id del usuario, list_pending_questions para ver la bandeja, get_question para el detalle, search_knowledge_base para consultar políticas y contenido de la empresa, y answer_question para publicar una respuesta en MeLi (acción pública e irreversible: confirmá con el usuario antes de invocarla).",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCompanies, listPendingQuestions, getQuestion, searchKnowledgeBase, answerQuestion],
});