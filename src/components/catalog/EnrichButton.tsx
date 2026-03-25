import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Download, Clock, CheckCircle2, Sparkles, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase-init';
import { toast } from 'sonner';

interface AiSuggestions {
  support_summary?: string;
  key_points?: string[];
  faq_bullets?: string[];
  warranty_notes?: string;
  shipping_notes?: string;
}

interface Props {
  productId: string;
  meliItemId: string | null;
  externalId: string | null;
  meliFetchedAt: string | null;
  onEnriched: () => void;
}

export function EnrichButton({ productId, meliItemId, externalId, meliFetchedAt, onEnriched }: Props) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AiSuggestions | null>(null);
  const [autoFilled, setAutoFilled] = useState<string[]>([]);

  const hasMeliId = !!(meliItemId || externalId);
  if (!hasMeliId) return null;

  const cacheAge = meliFetchedAt
    ? Math.round((Date.now() - new Date(meliFetchedAt).getTime()) / 3600000)
    : null;

  const enrich = async (force: boolean) => {
    setLoading(true);
    setSuggestions(null);
    setAutoFilled([]);
    try {
      const { data, error } = await supabase.functions.invoke('enrich-product', {
        body: { product_id: productId, force_refresh: force },
      });

      if (error) throw error;

      if (data?.enriched) {
        const filled = data.auto_filled || [];
        setAutoFilled(filled);

        if (filled.length > 0) {
          toast.success(`Ficha enriquecida: ${filled.length} campos completados con IA`);
        } else {
          toast.success('Datos de MeLi actualizados');
        }

        // Show AI suggestions for fields that already had content (not auto-filled)
        if (data.ai_suggestions) {
          const remaining: AiSuggestions = {};
          const s = data.ai_suggestions;
          if (s.support_summary && !filled.includes('support_summary')) remaining.support_summary = s.support_summary;
          if (s.key_points?.length > 0 && !filled.includes('key_points')) remaining.key_points = s.key_points;
          if (s.faq_bullets?.length > 0 && !filled.includes('faq_bullets')) remaining.faq_bullets = s.faq_bullets;
          if (s.warranty_notes && !filled.includes('warranty_notes')) remaining.warranty_notes = s.warranty_notes;
          if (s.shipping_notes && !filled.includes('shipping_notes')) remaining.shipping_notes = s.shipping_notes;
          if (Object.keys(remaining).length > 0) {
            setSuggestions(remaining);
          }
        }

        onEnriched();
      } else if (data?.reason === 'cache_fresh') {
        toast.info('Cache vigente. Usá "Forzar" para re-analizar con IA.');
      }
    } catch (e: any) {
      toast.error('Error al enriquecer: ' + (e.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = async (field: string, value: unknown) => {
    const { error } = await supabase
      .from('products')
      .update({ [field]: value })
      .eq('id', productId);

    if (error) {
      toast.error('Error al aplicar sugerencia');
      return;
    }

    toast.success(`Campo "${fieldLabel(field)}" actualizado`);
    setSuggestions((prev) => {
      if (!prev) return null;
      const next = { ...prev };
      delete (next as any)[field];
      return Object.keys(next).length > 0 ? next : null;
    });
    onEnriched();
  };

  const dismissSuggestion = (field: string) => {
    setSuggestions((prev) => {
      if (!prev) return null;
      const next = { ...prev };
      delete (next as any)[field];
      return Object.keys(next).length > 0 ? next : null;
    });
  };

  const fieldLabel = (f: string) => {
    const labels: Record<string, string> = {
      support_summary: 'Resumen soporte',
      key_points: 'Puntos clave',
      faq_bullets: 'FAQ',
      warranty_notes: 'Garantía',
      shipping_notes: 'Envío',
    };
    return labels[f] || f;
  };

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-foreground">Enriquecimiento MeLi + IA</span>
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
          {loading ? (
            <><RefreshCw className="w-3 h-3 animate-spin" /> Enriqueciendo…</>
          ) : (
            <><Sparkles className="w-3 h-3" /> Enriquecer con IA</>
          )}
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

      {/* Auto-filled confirmation */}
      {autoFilled.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {autoFilled.map((f) => (
            <Badge key={f} variant="secondary" className="text-[10px] gap-1 text-emerald-700 bg-emerald-50 border-emerald-200">
              <Check className="w-2.5 h-2.5" /> {fieldLabel(f)}
            </Badge>
          ))}
          <span className="text-[10px] text-muted-foreground ml-1">completados automáticamente</span>
        </div>
      )}

      {/* AI Suggestions for existing fields */}
      {suggestions && Object.keys(suggestions).length > 0 && (
        <div className="space-y-2 border-t border-border pt-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] font-medium text-foreground">Sugerencias IA (campos ya completos)</span>
          </div>
          {Object.entries(suggestions).map(([field, value]) => (
            <div key={field} className="rounded border border-border bg-background p-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {fieldLabel(field)}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                    onClick={() => applySuggestion(field, value)}
                  >
                    <Check className="w-3 h-3 mr-0.5" /> Aplicar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-[10px] text-muted-foreground"
                    onClick={() => dismissSuggestion(field)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="text-[11px] text-foreground">
                {Array.isArray(value) ? (
                  <ul className="space-y-0.5">
                    {(value as string[]).map((item, i) => (
                      <li key={i} className="text-muted-foreground">• {item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground whitespace-pre-line line-clamp-4">{value as string}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
