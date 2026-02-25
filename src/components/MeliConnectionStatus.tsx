import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

type TokenHealth = 'connected' | 'expiring_soon' | 'expired' | 'no_refresh' | 'disconnected' | null;

interface TokenInfo {
  health: TokenHealth;
  minutesLeft?: number;
}

const MeliConnectionStatus = () => {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo>({ health: null });
  const navigate = useNavigate();

  useEffect(() => {
    const loadStatus = async () => {
      const { data: token } = await supabase
        .from('meli_tokens')
        .select('id, expires_at, refresh_token')
        .limit(1)
        .maybeSingle();

      if (!token) {
        setTokenInfo({ health: 'disconnected' });
        return;
      }

      const now = Date.now();
      const expiresAt = new Date(token.expires_at).getTime();
      const minutesLeft = Math.round((expiresAt - now) / 60000);

      if (expiresAt <= now) {
        if (!token.refresh_token) {
          setTokenInfo({ health: 'no_refresh', minutesLeft: 0 });
        } else {
          setTokenInfo({ health: 'expired', minutesLeft: 0 });
        }
      } else if (minutesLeft <= 30) {
        if (!token.refresh_token) {
          setTokenInfo({ health: 'no_refresh', minutesLeft });
        } else {
          setTokenInfo({ health: 'expiring_soon', minutesLeft });
        }
      } else {
        if (!token.refresh_token) {
          setTokenInfo({ health: 'no_refresh', minutesLeft });
        } else {
          setTokenInfo({ health: 'connected', minutesLeft });
        }
      }
    };
    loadStatus();
  }, []);

  if (tokenInfo.health === null) return null;

  return (
    <button
      onClick={() => navigate('/settings')}
      className="flex items-center gap-2 text-xs hover:opacity-80 transition-opacity"
    >
      {tokenInfo.health === 'connected' && (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-muted-foreground">Mercado Libre conectado</span>
        </>
      )}
      {tokenInfo.health === 'expiring_soon' && (
        <>
          <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-amber-600 dark:text-amber-400">Token expira en {tokenInfo.minutesLeft} min</span>
        </>
      )}
      {tokenInfo.health === 'expired' && (
        <>
          <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
          <span className="text-destructive">Token expirado — se renovará en el próximo sync</span>
        </>
      )}
      {tokenInfo.health === 'no_refresh' && (
        <>
          <XCircle className="w-3.5 h-3.5 text-destructive" />
          <span className="text-destructive font-medium">⚠ Reconectar MeLi — sin refresh token</span>
        </>
      )}
      {tokenInfo.health === 'disconnected' && (
        <>
          <XCircle className="w-3.5 h-3.5 text-destructive" />
          <span className="text-muted-foreground">MercadoLibre no conectado</span>
        </>
      )}
    </button>
  );
};

export default MeliConnectionStatus;
