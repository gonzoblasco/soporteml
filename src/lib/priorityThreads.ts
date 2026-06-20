import { supabase } from '@/integrations/supabase/client';

/**
 * Returns the set of "thread keys" (`buyerId::productId`) for a company whose
 * hilo contains at least one `requires_human = true` open question.
 *
 * A hilo is identified by (buyer_id, product_id). When any single question of
 * that hilo is flagged priority, the whole hilo lives in Priority Inbox —
 * the rest of its messages are absorbed and hidden from the normal Inbox.
 */
export async function fetchPriorityThreadKeys(
  companyId: string,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('questions')
    .select('buyer_id, product_id')
    .eq('company_id', companyId)
    .eq('requires_human', true)
    .in('status', ['pending', 'needs_human']);

  const keys = new Set<string>();
  if (error || !data) return keys;
  for (const r of data) {
    if (r.buyer_id && r.product_id) keys.add(`${r.buyer_id}::${r.product_id}`);
  }
  return keys;
}

export function threadKey(buyerId: string | null, productId: string | null): string | null {
  if (!buyerId || !productId) return null;
  return `${buyerId}::${productId}`;
}