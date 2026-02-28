import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  product: {
    title?: string;
    support_summary?: string | null;
    key_points?: unknown[];
    shipping_notes?: string | null;
    returns_notes?: string | null;
    warranty_notes?: string | null;
  };
}

const FIELDS = [
  { key: 'support_summary', label: 'Resumen de soporte' },
  { key: 'key_points', label: 'Puntos clave', isArray: true },
  { key: 'shipping_notes', label: 'Notas de envío' },
  { key: 'returns_notes', label: 'Notas de devolución' },
  { key: 'warranty_notes', label: 'Notas de garantía' },
] as const;

export function CompletenessIndicator({ product }: Props) {
  const filled = FIELDS.filter((f) => {
    const val = (product as any)[f.key];
    if ('isArray' in f && f.isArray) return Array.isArray(val) && val.length > 0;
    return typeof val === 'string' && val.trim().length > 0;
  });

  const pct = Math.round((filled.length / FIELDS.length) * 100);
  const isComplete = pct === 100;

  const missing = FIELDS.filter((f) => !filled.includes(f));

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant={isComplete ? 'default' : 'outline'}
          className={`gap-1 text-[10px] cursor-default ${isComplete ? 'bg-emerald-600 hover:bg-emerald-600 text-white' : 'border-amber-500/50 text-amber-600'}`}
        >
          {isComplete ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {pct}% completa
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs max-w-52">
        {isComplete ? (
          <span>¡Ficha completa! La IA tiene toda la info necesaria.</span>
        ) : (
          <div>
            <p className="font-medium mb-1">Faltan campos:</p>
            <ul className="list-disc pl-3 space-y-0.5">
              {missing.map((m) => (
                <li key={m.key}>{m.label}</li>
              ))}
            </ul>
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
