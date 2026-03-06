export type QuestionCategory = 'Precio' | 'Stock' | 'Técnico' | 'Envío' | 'Garantía';
export type QuestionStatus = 'pending' | 'published' | 'archived' | 'error' | 'deleted' | 'queued_auto' | 'auto_published' | 'needs_human';

export interface QuestionRow {
  id: string;
  company_id: string;
  product_id: string | null;
  meli_question_id: string;
  buyer_id: string | null;
  buyer_nickname: string | null;
  question_text: string;
  status: string;
  ai_suggested_answer: string | null;
  ai_category: string | null;
  ai_confidence: number | null;
  ai_decision_reason: string | null;
  auto_action: string | null;
  answered_by_ai: boolean;
  final_answer: string | null;
  answered_by: string | null;
  created_at: string;
  answered_at: string | null;
  requires_human: boolean;
  requires_human_reason: string | null;
  meli_status: string | null;
  meli_permalink: string | null;
  // joined
  product_title?: string;
  product_meli_id?: string;
  product_permalink?: string;
  product_price?: number | null;
}
