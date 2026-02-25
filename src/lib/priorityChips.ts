import type { QuestionRow } from '@/types/question';

export interface PriorityChip {
  label: string;
  color: string; // tailwind classes
}

const CHIP_RULES: { pattern: RegExp; label: string; color: string }[] = [
  { pattern: /precio|negoci|descuento|oferta|rebaj/i, label: 'Negociación', color: 'bg-badge-precio/15 text-badge-precio' },
  { pattern: /stock|disponib|queda/i, label: 'Stock', color: 'bg-badge-stock/15 text-badge-stock' },
  { pattern: /devoluci|cambio|reembols/i, label: 'Devolución', color: 'bg-destructive/15 text-destructive' },
  { pattern: /garantía|defect|falla|roto/i, label: 'Garantía', color: 'bg-badge-garantia/15 text-badge-garantia' },
  { pattern: /envío|entreg|demora|llega/i, label: 'Envío', color: 'bg-badge-envio/15 text-badge-envio' },
  { pattern: /vehículo|auto|moto|camión/i, label: 'Vehículo', color: 'bg-badge-tecnico/15 text-badge-tecnico' },
  { pattern: /comple[jx]|técnic|especific/i, label: 'Consulta compleja', color: 'bg-badge-tecnico/15 text-badge-tecnico' },
  { pattern: /urgente|urgent|rápid/i, label: 'Urgente', color: 'bg-destructive/15 text-destructive' },
  { pattern: /venta|compra|interés|intención/i, label: 'Alta intención', color: 'bg-warning/15 text-warning' },
];

/**
 * Derive short priority chips from `requires_human_reason` text.
 * Returns 1-3 most relevant chips.
 */
export function derivePriorityChips(question: QuestionRow): PriorityChip[] {
  const reason = question.requires_human_reason ?? '';
  const text = question.question_text ?? '';
  const combined = `${reason} ${text}`;

  const chips: PriorityChip[] = [];

  for (const rule of CHIP_RULES) {
    if (rule.pattern.test(combined)) {
      chips.push({ label: rule.label, color: rule.color });
    }
    if (chips.length >= 3) break;
  }

  // Fallback: if no patterns matched but it's flagged as requires_human
  if (chips.length === 0 && question.requires_human) {
    chips.push({ label: 'Revisión manual', color: 'bg-warning/15 text-warning' });
  }

  return chips;
}
