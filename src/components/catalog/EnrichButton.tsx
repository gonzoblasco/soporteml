import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Download, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  productId: string;
  meliItemId: string | null;
  externalId: string | null;
  meliFetchedAt: string | null;
  onEnriched: () => void;
}

export function EnrichButton({ productId, meliItemId, externalId, meliFetchedAt, onEnriched }: Props) {
  const [loading, setLoading] = useState(false);

  const hasMeliId = !!(meliItemId || externalId);
  if (!hasMeliId) return null;

  const cacheAge = meliFetchedAt
    ? Math.round((Date.now() - new Date(meliFetchedAt).getTime()) / 3600000)
    : null;

  const enrich = async (force: boolean) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-product', {
        body: { product_id: productId, force_refresh: force },
      });

      if (error) throw error;

      if (data?.enriched) {
        toast.success(`Ficha enriquecida (${data.fields_updated?.length || 0} campos actualizados)`);
        onEnriched();
      } else if (data?.reason === 'cache_fresh') {
        toast.info(`Cache vigente (${data.cache_age_hours}h). Usá "Forzar" para actualizar.`);
      }
    } catch (e: any) {
      toast.error('Error al enriquecer: ' + (e.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground">Enriquecimiento MeLi</span>
        </div>
        {cacheAge !== null && (
          <Badge variant="outline" className="text-[10px] gap-1">
            {cacheAge < 24 ? (
              <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> {cacheAge}h</>
            ) : (
              <><Clock className="w-3 h-3 text-amber-500" /> {cacheAge}h</>
            )}
          </Badge>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 text-[11px] h-7"
          onClick={() => enrich(false)}
          disabled={loading}
        >
          <Download className="w-3 h-3" />
          {loading ? 'Cargando…' : 'Enriquecer'}
        </Button>
        {meliFetchedAt && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-[11px] h-7 text-muted-foreground"
            onClick={() => enrich(true)}
            disabled={loading}
          >
            <RefreshCw className="w-3 h-3" />
            Forzar
          </Button>
        )}
      </div>
    </div>
  );
}
