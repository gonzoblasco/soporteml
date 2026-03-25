import { supabase } from '@/lib/supabase-init';
import type { QuestionRow } from '@/types/question';

export interface CopilotRequestPayload {
  question: Pick<
    QuestionRow,
    | 'question_text'
    | 'product_title'
    | 'product_price'
    | 'buyer_nickname'
    | 'ai_category'
    | 'ai_suggested_answer'
    | 'product_id'
  >;
  aiTone: string;
  aiCustomInstructions?: string | null;
}

export interface CrmSuggestion {
  message: string;
  tab?: string;
}

export interface KnowledgeSuggestion {
  message: string;
  type: string;
}

export interface CopilotResult {
  summary: string;
  draft: string;
  missing_data: string[];
  crm_suggestions?: CrmSuggestion[];
  knowledge_suggestions?: KnowledgeSuggestion[];
}

export async function fetchCopilotSuggestion(
  payload: CopilotRequestPayload
): Promise<CopilotResult> {
  const { question, aiTone, aiCustomInstructions } = payload;

  const { data, error } = await supabase.functions.invoke('ai-copilot', {
    body: {
      question_text: question.question_text,
      product_title: question.product_title,
      product_price: question.product_price,
      buyer_nickname: question.buyer_nickname,
      ai_category: question.ai_category,
      ai_suggested_answer: question.ai_suggested_answer,
      ai_tone: aiTone,
      ai_custom_instructions: aiCustomInstructions,
      product_id: question.product_id || undefined,
    },
  });

  if (error) {
    throw new Error(error.message || 'Error al consultar el copiloto');
  }

  if (!data) {
    throw new Error('Respuesta vacía del copiloto');
  }

  if ((data as any).error) {
    throw new Error((data as any).error);
  }

  return data as CopilotResult;
}

