export async function generateAiAnswer(
  questionText: string,
  productContext: string,
  config: {
    aiTone?: string;
    aiCustomInstructions?: string | null;
    exclusionRules?: string | null;
    buyerNickname?: string | null;
    productTitle?: string | null;
    productPrice?: number | null;
    crmKnowledge?: string;
    businessKnowledge?: string;
  }
): Promise<{ answer: string; category: string; requires_human: boolean; requires_human_reason: string; confidence: number }> {
  const AI_API_KEY = Deno.env.get("AI_API_KEY");
  if (!AI_API_KEY) {
    return { answer: "", category: "Otro", requires_human: false, requires_human_reason: "", confidence: 0 };
  }

  const {
    aiTone = "profesional",
    aiCustomInstructions = null,
    exclusionRules = null,
    buyerNickname = null,
    productTitle = null,
    productPrice = null,
    crmKnowledge = "",
    businessKnowledge = "",
  } = config;

  const customInstructions = aiCustomInstructions ? `\nInstrucciones adicionales del vendedor: ${aiCustomInstructions}` : "";

  let systemPrompt = `Sos un copiloto de atención al cliente para vendedores de Mercado Libre en Argentina.
Tu trabajo es analizar la pregunta de un comprador y generar una respuesta precisa.

Tono: ${aiTone}. Escribí en español rioplatense neutro, sin tutear.${customInstructions}

REGLAS IMPORTANTES:
- NUNCA le digas al comprador que consulte la publicación, que mire la página, o que revise los detalles del producto.
- Si la información solicitada está en los datos del producto, respondé con esa información concreta.
- Si la información NO está disponible, decí honestamente que no tenés esa información y ofrecé ayuda alternativa.
- Respondé de forma directa y útil, con datos concretos (colores, medidas, precios, etc.).
- No uses más de 350 caracteres en la respuesta (límite de MeLi).

Clasificá cada pregunta en UNA de estas categorías: Precio, Stock, Técnico, Envío, Garantía, Otro.

EVALUACIÓN DE INTERVENCIÓN HUMANA:
Determiná si esta pregunta requiere intervención humana. Marcá requires_human = true cuando:
- Sea una negociación de precio, oferta o contraoferta
- Involucre compra/venta/trueque de vehículos, motos, o bienes de alto valor
- El comprador pida contacto directo, teléfono o comunicación fuera de MeLi
- Sea una queja seria o conflicto que necesite atención personal
- Involucre temas legales, financiamiento, o condiciones especiales de pago

CONFIDENCE SCORE:
Evaluá tu nivel de confianza en la respuesta con un número entre 0 y 1:
- 0.9-1.0: La respuesta está directamente en los datos del producto, es factual y segura
- 0.7-0.89: La respuesta es razonable pero requiere algo de inferencia
- 0.5-0.69: Hay incertidumbre significativa
- 0.0-0.49: No tenés suficiente información para responder con confianza`;

  if (exclusionRules) {
    systemPrompt += `\n\nREGLAS ADICIONALES DE EXCLUSIÓN (marcá requires_human = true si aplican):\n${exclusionRules}`;
  }

  if (crmKnowledge) {
    systemPrompt += crmKnowledge;
  }

  if (businessKnowledge) {
    systemPrompt += businessKnowledge;
  }

  systemPrompt += `\n\nRespondé SOLO con un JSON válido (sin markdown, sin backticks), con esta estructura exacta:
{"answer": "tu respuesta lista para publicar, corta y clara", "category": "categoría", "requires_human": true/false, "requires_human_reason": "razón breve si aplica", "confidence": 0.85}`;

  const userPrompt = `Pregunta del comprador: "${questionText}"
Comprador: ${buyerNickname || "desconocido"}
Producto: ${productTitle || "sin título"}${productPrice != null ? ` — $${productPrice}` : ""}

Datos del producto (publicación MeLi):
${productContext}`;

  try {
    const aiUrl = Deno.env.get("AI_API_URL") || "https://api.openai.com/v1/chat/completions";
    const res = await fetch(aiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: Deno.env.get("AI_MODEL") || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      console.error("AI gateway error:", await res.text());
      return { answer: "", category: "Otro", requires_human: false, requires_human_reason: "", confidence: 0 };
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    const cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        answer: parsed.answer || "",
        category: parsed.category || "Otro",
        requires_human: parsed.requires_human ?? false,
        requires_human_reason: parsed.requires_human_reason || "",
        confidence: typeof parsed.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.5,
      };
    }
    return { answer: content.slice(0, 350), category: "Otro", requires_human: false, requires_human_reason: "", confidence: 0.5 };
  } catch (e) {
    console.error("AI generation error:", e);
    return { answer: "", category: "Otro", requires_human: false, requires_human_reason: "", confidence: 0 };
  }
}

export async function generateCopilotDraft(
  questionText: string,
  productContext: string,
  config: {
    aiTone?: string;
    aiCustomInstructions?: string | null;
    buyerNickname?: string | null;
    productTitle?: string | null;
    productPrice?: number | null;
    crmKnowledge?: string;
    businessKnowledge?: string;
    aiCategory?: string | null;
    previousAnswer?: string | null;
  }
): Promise<{ summary: string; draft: string; missing_data: string[] }> {
  const AI_API_KEY = Deno.env.get("AI_API_KEY");
  if (!AI_API_KEY) {
    return { summary: "Error: AI_API_KEY not configured", draft: "", missing_data: [] };
  }

  const {
    aiTone = "profesional",
    aiCustomInstructions = null,
    buyerNickname = null,
    productTitle = null,
    productPrice = null,
    crmKnowledge = "",
    businessKnowledge = "",
    aiCategory = null,
    previousAnswer = null,
  } = config;

  const customInstructions = aiCustomInstructions ? `\nInstrucciones adicionales del vendedor: ${aiCustomInstructions}` : "";

  const systemPrompt = `Sos un copiloto de atención al cliente para vendedores de Mercado Libre en Argentina.
Tu trabajo es analizar la pregunta de un comprador y devolver un JSON estructurado con 3 campos.

Tono: ${aiTone}. Escribí en español rioplatense neutro, sin tutear.${customInstructions}

Respondé SOLO con un JSON válido (sin markdown, sin backticks), con esta estructura exacta:
{
  "summary": "Resumen en 1-2 oraciones de qué pide o necesita el comprador",
  "draft": "Borrador de respuesta listo para publicar, corto y claro",
  "missing_data": ["lista de datos que faltan para dar una respuesta completa, ej: talle, color, dirección"]
}

Si no falta ningún dato, devolvé "missing_data": [].
Si ya hay una sugerencia previa de IA, podés mejorarla o usarla como base.${crmKnowledge}${businessKnowledge}`;

  const userPrompt = `Pregunta del comprador: "${questionText}"
Comprador: ${buyerNickname || "desconocido"}
Producto: ${productTitle || "sin título"}${productPrice != null ? ` — $${productPrice}` : ""}
Categoría IA: ${aiCategory || "sin categorizar"}
${previousAnswer ? `Sugerencia IA previa: "${previousAnswer}"` : "No hay sugerencia previa."}

Datos del producto (publicación MeLi):
${productContext}`;

  try {
    const aiUrl = Deno.env.get("AI_API_URL") || "https://api.openai.com/v1/chat/completions";
    const res = await fetch(aiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: Deno.env.get("AI_MODEL") || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("AI gateway error:", error);
      throw new Error(`AI error: ${res.status}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    const cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return {
      summary: "No pude analizar la pregunta automáticamente.",
      draft: content || "",
      missing_data: [],
    };
  } catch (e) {
    console.error("AI generation error:", e);
    return {
      summary: "Error al generar la respuesta.",
      draft: "",
      missing_data: [],
    };
  }
}
