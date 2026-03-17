import type { QuestionRow } from '@/types/question';

export interface QuestionGroup {
  /** Unique key for the group: `buyerId::productId` */
  key: string;
  buyer_id: string | null;
  buyer_nickname: string | null;
  product_id: string | null;
  product_title: string | null;
  product_meli_id: string | null;
  product_permalink: string | null;
  product_price: number | null;
  /** Most recent created_at among items */
  latest_at: string;
  /** All questions in this group, sorted newest first */
  questions: QuestionRow[];
}

/**
 * Groups questions by (buyer_id + product_id).
 * Questions without a buyer_id stay ungrouped (group of 1).
 * Returns groups sorted by latest activity (most recent first).
 */
export function groupQuestions(questions: QuestionRow[]): QuestionGroup[] {
  const map = new Map<string, QuestionGroup>();

  for (const q of questions) {
    // Only group when we have both buyer_id and product_id
    const canGroup = q.buyer_id && q.product_id;
    const key = canGroup ? `${q.buyer_id}::${q.product_id}` : `solo::${q.id}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        buyer_id: q.buyer_id,
        buyer_nickname: q.buyer_nickname,
        product_id: q.product_id,
        product_title: q.product_title ?? null,
        product_meli_id: q.product_meli_id ?? null,
        product_permalink: q.product_permalink ?? null,
        product_price: q.product_price ?? null,
        latest_at: q.created_at,
        questions: [],
      });
    }

    const group = map.get(key)!;
    group.questions.push(q);

    // Keep latest_at updated
    if (q.created_at > group.latest_at) {
      group.latest_at = q.created_at;
      group.buyer_nickname = q.buyer_nickname;
    }
  }

  // Sort groups by latest activity
  return Array.from(map.values()).sort((a, b) => {
    const aTime = new Date(a.latest_at).getTime();
    const bTime = new Date(b.latest_at).getTime();

    // Handle invalid dates: treat NaN as very old (epoch 0)
    const aValid = !isNaN(aTime) ? aTime : 0;
    const bValid = !isNaN(bTime) ? bTime : 0;

    return bValid - aValid;
  });
}
