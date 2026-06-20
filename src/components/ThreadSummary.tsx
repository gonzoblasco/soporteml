import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import type { QuestionRow } from '@/types/question';

interface Props {
  thread: QuestionRow[];
  companyId: string | null;
}

/**
 * AI-generated summary of a conversation hilo. Renders only when the hilo
 * has 2+ messages. Cached server-side; invalidates when messages change.
 */
const ThreadSummary = ({ thread, companyId }: Props) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable key for the hilo: buyer + product.
  const buyerId = thread[0]?.buyer_id ?? null;
  const productId = thread[0]?.product_id ?? null;
  // Hash signal so we refetch when the set of question IDs changes.
  const signature = thread.map((q) => `${q.id}:${q.final_answer ? '1' : '0'}`).join('|');

  const load = async (force = false) => {
    if (!companyId || !buyerId || !productId || thread.length < 2) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.functions.invoke('summarize-thread', {
      body: { company_id: companyId, buyer_id: buyerId, product_id: productId, force },
    });
    setLoading(false);
    if (error) {
      setError('No se pudo generar el resumen');
      return;
    }
    if (data?.error === 'rate_limited') { setError('Demasiadas solicitudes, probá en un momento'); return; }
    if (data?.error === 'credits_exhausted') { setError('Sin créditos de IA disponibles'); return; }
    if (data?.error) { setError('No se pudo generar el resumen'); return; }
    setSummary(data?.summary ?? null);
  };

  useEffect(() => {
    setSummary(null);
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, buyerId, productId, signature]);

  if (!companyId || !buyerId || !productId || thread.length < 2) return null;

  return (
    <div className="rounded-lg bg-primary/5 border border-primary/15 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            Resumen del hilo · {thread.length} mensajes
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => load(true)}
          disabled={loading}
          title="Regenerar resumen"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      {loading && !summary ? (
        <div className="space-y-1.5">
          <div className="h-2 bg-muted/60 rounded animate-pulse w-11/12" />
          <div className="h-2 bg-muted/60 rounded animate-pulse w-9/12" />
        </div>
      ) : error ? (
        <p className="text-xs text-muted-foreground">{error}</p>
      ) : summary ? (
        <p className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap">{summary}</p>
      ) : (
        <p className="text-xs text-muted-foreground">Generando resumen…</p>
      )}
    </div>
  );
};

export default ThreadSummary;