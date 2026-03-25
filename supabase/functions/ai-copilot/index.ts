import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { generateCopilotDraft } from "../_shared/ai-service.ts";
import { corsHeaders } from "../_shared/utils.ts";
import { fetchKnowledgeContext } from "../_shared/knowledge-service.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("ai-copilot: Missing or invalid Bearer token");
      return new Response(JSON.stringify({ 
        error: "No autorizado - Token requerido", 
        code: "AUTH_MISSING_BEARER" 
      }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract the token for logging
    const token = authHeader.substring(7);
    console.log("ai-copilot: Received Authorization header with token length:", token.length);
    console.log("ai-copilot: Token starts with:", token.substring(0, 20));

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    console.log("ai-copilot: Using Supabase URL:", supabaseUrl);
    console.log("ai-copilot: Anon key length:", supabaseAnonKey?.length);

    const supabaseAuth = createClient(
      supabaseUrl!,
      supabaseAnonKey!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError) {
      console.error("ai-copilot: Auth verification failed:", {
        message: userError.message,
        status: (userError as any).status,
        name: userError.name,
        fullError: userError
      });
      return new Response(JSON.stringify({ 
        error: `No autorizado - ${userError.message}`, 
        code: "AUTH_INVALID_USER", 
        details: userError.message 
      }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!user) {
      console.error("ai-copilot: No user found in session");
      return new Response(JSON.stringify({ 
        error: "No autorizado - Usuario no encontrado", 
        code: "AUTH_NO_USER" 
      }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("ai-copilot: ✓ Auth successful for user", user.id);

    const { question_text, product_title, product_price, buyer_nickname, ai_category, ai_suggested_answer, ai_tone, ai_custom_instructions, product_id } = await req.json();

    // Input validation
    if (!question_text || typeof question_text !== 'string' || question_text.trim().length === 0) {
      console.error("ai-copilot: Invalid question_text:", { provided: question_text, type: typeof question_text });
      return new Response(JSON.stringify({ error: "question_text es requerido", code: "VALIDATION_EMPTY_QUESTION" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (product_id && (typeof product_id !== 'string' || product_id.trim().length === 0)) {
      console.error("ai-copilot: Invalid product_id:", { provided: product_id, type: typeof product_id });
      return new Response(JSON.stringify({ error: "product_id debe ser un string válido", code: "VALIDATION_INVALID_PRODUCT_ID" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const AI_API_KEY = Deno.env.get("AI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!AI_API_KEY) {
      console.error("ai-copilot: Neither AI_API_KEY nor LOVABLE_API_KEY configured");
      throw new Error("AI API key not configured");
    }

    const toneLabel = ai_tone || "profesional";
    const customInstructions = ai_custom_instructions ? `\nInstrucciones adicionales del vendedor: ${ai_custom_instructions}` : "";

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: callerCompanyId, error: rpcError } = await serviceClient.rpc("get_user_company_id", { _user_id: user.id });

    if (rpcError) {
      console.error("ai-copilot: RPC get_user_company_id failed:", rpcError.message);
      throw new Error(`Failed to get user company: ${rpcError.message}`);
    }

    if (!callerCompanyId) {
      console.error("ai-copilot: No active company found for user", user.id);
      return new Response(JSON.stringify({ error: "No active membership found", code: "USER_NO_COMPANY" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch CRM product knowledge if product_id is provided
    let productKnowledge = "";
    let productCategoryId: string | null = null;
    let productCategoryName: string | null = null;
    let crmProduct: any = null;

    if (product_id) {
      const { data: product } = await serviceClient
        .from("products")
        .select("support_summary, key_points, shipping_notes, returns_notes, warranty_notes, faq_bullets, do_not_say, meli_category_id, meli_category_name")
        .eq("id", product_id)
        .eq("company_id", callerCompanyId)
        .maybeSingle();

      crmProduct = product;

      if (crmProduct) {
        productCategoryId = crmProduct.meli_category_id;
        productCategoryName = crmProduct.meli_category_name;

        const parts: string[] = [`\n\n--- CONOCIMIENTO CRM DEL PRODUCTO ---`];
        parts.push(`Resumen: ${crmProduct.support_summary}`);
        if ((crmProduct.key_points as string[])?.length) parts.push(`Puntos clave:\n${(crmProduct.key_points as string[]).map((p: string) => `• ${p}`).join('\n')}`);
        if (crmProduct.shipping_notes) parts.push(`Envíos: ${crmProduct.shipping_notes}`);
        if (crmProduct.returns_notes) parts.push(`Devoluciones: ${crmProduct.returns_notes}`);
        if (crmProduct.warranty_notes) parts.push(`Garantía: ${crmProduct.warranty_notes}`);
        if ((crmProduct.faq_bullets as string[])?.length) parts.push(`FAQ:\n${(crmProduct.faq_bullets as string[]).map((f: string) => `• ${f}`).join('\n')}`);
        if ((crmProduct.do_not_say as string[])?.length) parts.push(`NO PROMETER:\n${(crmProduct.do_not_say as string[]).map((d: string) => `⚠️ ${d}`).join('\n')}`);
        productKnowledge = parts.join('\n');

        // Fetch variants
        const { data: variants } = await serviceClient
          .from("product_variants")
          .select("variant_name, attributes, support_notes")
          .eq("product_id", product_id)
          .is("archived_at", null);

        if (variants?.length) {
          const varLines = variants.map((v: any) => {
            const attrs = Object.entries(v.attributes || {}).map(([k, val]) => `${k}: ${val}`).join(', ');
            return `- ${v.variant_name}${attrs ? ` (${attrs})` : ''}${v.support_notes ? ` — ${v.support_notes}` : ''}`;
          });
          productKnowledge += `\nVariantes:\n${varLines.join('\n')}`;
        }
      }
    }

    // ─── Fetch knowledge entries (global + category) ───
    let knowledgeQuery = serviceClient
      .from("knowledge_entries")
      .select("title, content, type, priority, scope, scope_ref")
      .eq("company_id", callerCompanyId)
      .eq("ai_visible", true)
      .eq("is_active", true)
      .order("priority", { ascending: false });

    if (productCategoryId) {
      knowledgeQuery = knowledgeQuery.or(`scope.eq.global,and(scope.eq.categoria,scope_ref.eq.${productCategoryId})`);
    } else {
      knowledgeQuery = knowledgeQuery.eq("scope", "global");
    }

    const { data: kEntries } = await knowledgeQuery;
    
    // CRM suggestions
    const crmSuggestions: Array<{message: string; tab?: string}> = [];
    if (product_id) {
      if (!crmProduct) {
        crmSuggestions.push({ message: "El producto especificado no existe o no tienes acceso" });
      } else {
        if (!crmProduct.support_summary) crmSuggestions.push({ message: "Completá el resumen de soporte para respuestas más precisas", tab: "conocimiento" });
        if (!(crmProduct.key_points as string[])?.length) crmSuggestions.push({ message: "Agregá puntos clave del producto", tab: "conocimiento" });
        if (!crmProduct.shipping_notes) crmSuggestions.push({ message: "Completá las notas de envío", tab: "politicas" });
        if (!crmProduct.returns_notes) crmSuggestions.push({ message: "Agregá la política de devoluciones", tab: "politicas" });
        if (!crmProduct.warranty_notes) crmSuggestions.push({ message: "Completá los datos de garantía", tab: "politicas" });
      }
    } else {
      crmSuggestions.push({ message: "Creá una ficha CRM para este producto y mejorá las respuestas automáticas" });
    }

    // ─── Fetch knowledge entries (global + category) using shared service ───
    const { positive: knowledgePositive, restrictions: knowledgeRestrictions } = await fetchKnowledgeContext(
      serviceClient,
      callerCompanyId,
      productCategoryId
    );

    const parsed = await generateCopilotDraft(
      question_text,
      productKnowledge,
      {
        aiTone: toneLabel,
        aiCustomInstructions: customInstructions,
        buyerNickname: buyer_nickname,
        productTitle: product_title,
        productPrice: product_price,
        crmKnowledge: productKnowledge,
        businessKnowledge: knowledgeRestrictions + knowledgePositive,
        aiCategory: ai_category,
        previousAnswer: ai_suggested_answer,
      }
    );

    if (crmSuggestions.length > 0) {
      (parsed as any).crm_suggestions = crmSuggestions;
    }

    // Knowledge gap suggestions
    const globalTypes = new Set((kEntries || []).filter((e: any) => e.scope === 'global').map((e: any) => e.type));
    const knowledgeSuggestions: Array<{message: string; type: string}> = [];
    if (!globalTypes.has('politica')) knowledgeSuggestions.push({ message: "Podrías agregar una política de envíos o devoluciones para mejorar las respuestas", type: "politica" });
    if (!globalTypes.has('restriccion')) knowledgeSuggestions.push({ message: "Definí qué no prometer a los compradores para evitar respuestas riesgosas", type: "restriccion" });
    if (!globalTypes.has('faq')) knowledgeSuggestions.push({ message: "Agregá preguntas frecuentes para respuestas más completas", type: "faq" });

    if (productCategoryId) {
      const hasCategoryEntries = (kEntries || []).some((e: any) => e.scope === 'categoria' && e.scope_ref === productCategoryId);
      if (!hasCategoryEntries) {
        knowledgeSuggestions.push({ message: `No hay conocimiento específico para la categoría "${productCategoryName || productCategoryId}". Agregá artículos para respuestas más precisas`, type: "categoria" });
      }
    }

    if (knowledgeSuggestions.length > 0) {
      (parsed as any).knowledge_suggestions = knowledgeSuggestions.slice(0, 2);
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    const errorCode = e instanceof Error ? e.name : "UNKNOWN_ERROR";
    console.error("ai-copilot error:", { message: errorMsg, code: errorCode, stack: e instanceof Error ? e.stack : undefined });

    // Handle specific AI API errors
    if (errorMsg.startsWith('AI_API_ERROR:')) {
      const parts = errorMsg.split(':');
      const statusCode = parseInt(parts[1]);
      const errorDetails = parts.slice(2).join(':');

      let userFriendlyMessage = 'Error en el servicio de IA';
      let httpStatus = 500;

      switch (statusCode) {
        case 401:
          userFriendlyMessage = 'Error de autenticación con el servicio de IA. Verifica la configuración de la API key.';
          httpStatus = 503; // Service Unavailable
          break;
        case 429:
          userFriendlyMessage = 'Límite de uso del servicio de IA alcanzado. Intenta nuevamente en unos minutos.';
          httpStatus = 503; // Service Unavailable
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          userFriendlyMessage = 'El servicio de IA no está disponible temporalmente. Intenta nuevamente.';
          httpStatus = 503; // Service Unavailable
          break;
        default:
          userFriendlyMessage = `Error del servicio de IA (${statusCode}): ${errorDetails}`;
          httpStatus = 500;
      }

      return new Response(JSON.stringify({
        error: userFriendlyMessage,
        code: `AI_API_ERROR_${statusCode}`,
        details: errorDetails
      }), {
        status: httpStatus,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: errorMsg, code: errorCode }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
