/**
 * SLA (Service Level Agreement) helpers for question response times.
 *
 * Estados:
 *   - `on_track`: Tiempo restante > umbral de aviso (>25% del SLA o >15 min)
 *   - `at_risk`:  Tiempo restante en zona de alerta (la zona más amplia entre 25% y 15 min)
 *   - `breached`: Ya pasó el SLA configurado
 *   - `met`:      Respondida dentro del SLA (solo aplica con `answeredAt`)
 *   - `missed`:   Respondida después del SLA
 */
export type SlaStatus = 'on_track' | 'at_risk' | 'breached' | 'met' | 'missed';

export interface SlaInfo {
  status: SlaStatus;
  /** Minutos transcurridos desde la creación (truncados). */
  elapsedMin: number;
  /** Minutos restantes hasta el deadline (negativo si ya pasó). */
  remainingMin: number;
  /** Etiqueta corta para UI (ej "Vence en 12 min", "Vencida hace 3 min", "Resuelta en 28 min"). */
  label: string;
  /** Clase Tailwind para chip (bg + text + border). */
  chipClass: string;
  /** Texto puro para tooltip. */
  tooltip: string;
}

const formatMin = (m: number): string => {
  const abs = Math.abs(m);
  if (abs < 60) return `${abs} min`;
  const h = Math.floor(abs / 60);
  const r = abs % 60;
  return r === 0 ? `${h}h` : `${h}h ${r}m`;
};

export const computeSlaInfo = (
  createdAt: string,
  targetMinutes: number,
  answeredAt?: string | null,
): SlaInfo => {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const elapsedMin = Math.floor((now - created) / 60000);

  // Resolved questions: met or missed
  if (answeredAt) {
    const answered = new Date(answeredAt).getTime();
    const responseMin = Math.floor((answered - created) / 60000);
    if (responseMin <= targetMinutes) {
      return {
        status: 'met',
        elapsedMin: responseMin,
        remainingMin: targetMinutes - responseMin,
        label: `Resuelta en ${formatMin(responseMin)}`,
        chipClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
        tooltip: `Respondida en ${formatMin(responseMin)} (SLA ${formatMin(targetMinutes)})`,
      };
    }
    return {
      status: 'missed',
      elapsedMin: responseMin,
      remainingMin: targetMinutes - responseMin,
      label: `Resuelta fuera de SLA`,
      chipClass: 'bg-muted text-muted-foreground border-border',
      tooltip: `Respondida en ${formatMin(responseMin)}, ${formatMin(responseMin - targetMinutes)} sobre el SLA`,
    };
  }

  const remainingMin = targetMinutes - elapsedMin;

  if (remainingMin < 0) {
    return {
      status: 'breached',
      elapsedMin,
      remainingMin,
      label: `Vencida hace ${formatMin(remainingMin)}`,
      chipClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
      tooltip: `SLA superado por ${formatMin(remainingMin)} (target ${formatMin(targetMinutes)})`,
    };
  }

  // At-risk zone: la más amplia entre 25% del target o 15 min restantes
  const atRiskThreshold = Math.max(Math.ceil(targetMinutes * 0.25), 15);
  if (remainingMin <= atRiskThreshold) {
    return {
      status: 'at_risk',
      elapsedMin,
      remainingMin,
      label: `Vence en ${formatMin(remainingMin)}`,
      chipClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
      tooltip: `Quedan ${formatMin(remainingMin)} para cumplir el SLA (${formatMin(targetMinutes)})`,
    };
  }

  return {
    status: 'on_track',
    elapsedMin,
    remainingMin,
    label: `Vence en ${formatMin(remainingMin)}`,
    chipClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    tooltip: `Quedan ${formatMin(remainingMin)} para cumplir el SLA (${formatMin(targetMinutes)})`,
  };
};

/** Helper para ordenar por urgencia: más vencidas primero, luego más cerca de vencer. */
export const slaUrgencyScore = (info: SlaInfo): number => {
  // breached: muy negativo (más urgente cuanto más vencida)
  // at_risk: negativo proporcional
  // on_track: positivo (cuanto más lejos del deadline, menor urgencia)
  return info.remainingMin;
};