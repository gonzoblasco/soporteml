export function isOutsideBusinessHours(businessHours: { days: string[]; start_time: string; end_time: string }): boolean {
  // Use Argentina timezone (UTC-3)
  const now = new Date();
  const argentinaOffset = -3 * 60; // minutes
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const argNow = new Date(utcMs + argentinaOffset * 60000);

  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const currentDay = dayNames[argNow.getDay()];

  // If today is not a business day, we're outside hours
  if (!businessHours.days.includes(currentDay)) return true;

  const currentMinutes = argNow.getHours() * 60 + argNow.getMinutes();
  const [startH, startM] = businessHours.start_time.split(':').map(Number);
  const [endH, endM] = businessHours.end_time.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return currentMinutes < startMinutes || currentMinutes >= endMinutes;
}
