/**
 * Formatea una fecha ISO como tiempo relativo en español.
 * Reemplaza date-fns/locale para evitar el bug de instancias
 * duplicadas de React (dispatcher.useContext).
 */
export const timeAgoEs = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
};
