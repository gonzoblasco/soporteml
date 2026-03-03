import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DuplicateCandidate {
  product_id: string;
  title: string;
  match_level: 'external_id' | 'meli_item_id' | 'sku' | 'title_similarity';
  match_value: string;
  similarity?: number;
}

interface Props {
  productId: string;
  onSelectDuplicate?: (duplicateId: string) => void;
}

const LEVEL_LABELS: Record<string, string> = {
  external_id: 'ID externo',
  meli_item_id: 'MeLi ID',
  sku: 'SKU',
  title_similarity: 'Título similar',
};

const LEVEL_COLORS: Record<string, string> = {
  external_id: 'bg-destructive/10 text-destructive border-destructive/20',
  meli_item_id: 'bg-destructive/10 text-destructive border-destructive/20',
  sku: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  title_similarity: 'bg-muted text-muted-foreground border-border',
};

export function DuplicateDetector({ productId, onSelectDuplicate }: Props) {
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<DuplicateCandidate[] | null>(null);

  const detect = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-duplicates', {
        body: { product_id: productId },
      });

      if (error) throw error;

      setCandidates(data?.duplicates ?? []);
      if (data?.count === 0) {
        toast.success('Sin duplicados detectados');
      }
    } catch (e: any) {
      toast.error('Error: ' + (e.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Copy className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground">Detección de duplicados</span>
        </div>
      </div>

      {candidates === null ? (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-[11px] h-7"
          onClick={detect}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
          {loading ? 'Buscando…' : 'Buscar duplicados'}
        </Button>
      ) : candidates.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">✓ Sin duplicados encontrados</p>
      ) : (
        <div className="space-y-1.5">
          {candidates.map((c) => (
            <button
              key={c.product_id}
              onClick={() => onSelectDuplicate?.(c.product_id)}
              className="w-full text-left rounded-md border border-border p-2 hover:bg-accent transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-medium text-foreground truncate flex-1">{c.title}</p>
                <Badge variant="outline" className={`text-[9px] shrink-0 ${LEVEL_COLORS[c.match_level]}`}>
                  {LEVEL_LABELS[c.match_level]}
                  {c.similarity ? ` ${Math.round(c.similarity * 100)}%` : ''}
                </Badge>
              </div>
            </button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-[11px] h-6 text-muted-foreground"
            onClick={() => setCandidates(null)}
          >
            Cerrar
          </Button>
        </div>
      )}
    </div>
  );
}
