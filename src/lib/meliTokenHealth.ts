/**
 * Unified MeLi token health semantics.
 * Single source of truth for all UI components.
 */

export type MeliHealthStatus =
  | 'connected'             // Token válido + refresh_token → verde
  | 'no_refresh_valid'      // Token válido, sin refresh → ámbar
  | 'expired_with_refresh'  // Expirado pero tiene refresh → ámbar suave
  | 'no_refresh_expired'    // Expirado sin refresh → rojo
  | 'disconnected'          // Sin token
  | null;                   // Loading

export interface MeliHealthInfo {
  status: MeliHealthStatus;
  minutesLeft?: number;
}

export interface MeliHealthUI {
  label: string;
  description: string;
  color: 'green' | 'amber' | 'red' | 'muted';
  showReconnectCTA: boolean;
}

export function computeHealth(token: { expires_at: string; refresh_token?: string | null; has_refresh_token?: boolean } | null): MeliHealthInfo {
  if (!token) return { status: 'disconnected' };

  const now = Date.now();
  const expiresAt = new Date(token.expires_at).getTime();
  const minutesLeft = Math.max(0, Math.round((expiresAt - now) / 60000));
  const isExpired = expiresAt <= now;
  const hasRefresh = token.has_refresh_token ?? !!token.refresh_token;

  if (isExpired) {
    return {
      status: hasRefresh ? 'expired_with_refresh' : 'no_refresh_expired',
      minutesLeft: 0,
    };
  }

  if (!hasRefresh) {
    return { status: 'no_refresh_valid', minutesLeft };
  }

  return { status: 'connected', minutesLeft };
}

export function getHealthUI(status: MeliHealthStatus): MeliHealthUI {
  switch (status) {
    case 'connected':
      return {
        label: 'Conectado',
        description: 'MercadoLibre conectado y funcionando correctamente.',
        color: 'green',
        showReconnectCTA: false,
      };
    case 'no_refresh_valid':
      return {
        label: 'Conectado (sin renovación)',
        description: 'Llegan consultas, pero cuando venza no se podrá renovar solo. Conviene reconectar.',
        color: 'amber',
        showReconnectCTA: true,
      };
    case 'expired_with_refresh':
      return {
        label: 'Renovación automática pendiente',
        description: 'El token se renovará automáticamente en el próximo sync. Podés seguir trabajando.',
        color: 'amber',
        showReconnectCTA: false,
      };
    case 'no_refresh_expired':
      return {
        label: 'Reconexión necesaria',
        description: 'No se puede renovar automáticamente. Reconectá MercadoLibre para seguir recibiendo consultas.',
        color: 'red',
        showReconnectCTA: true,
      };
    case 'disconnected':
      return {
        label: 'No conectado',
        description: 'Conectá tu cuenta de MercadoLibre para empezar a recibir consultas.',
        color: 'muted',
        showReconnectCTA: true,
      };
    default:
      return {
        label: 'Cargando...',
        description: '',
        color: 'muted',
        showReconnectCTA: false,
      };
  }
}
