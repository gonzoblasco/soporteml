export type QuestionCategory = 'Precio' | 'Stock' | 'Técnico' | 'Envío' | 'Garantía';
export type QuestionStatus = 'pending' | 'published' | 'archived' | 'error' | 'deleted';

export interface QuestionRow {
  id: string;
  company_id: string;
  product_id: string | null;
  meli_question_id: string;
  buyer_id: string | null;
  question_text: string;
  status: string;
  ai_suggested_answer: string | null;
  ai_category: string | null;
  final_answer: string | null;
  answered_by: string | null;
  created_at: string;
  answered_at: string | null;
  requires_human: boolean;
  requires_human_reason: string | null;
  // joined
  product_title?: string;
  product_meli_id?: string;
}
