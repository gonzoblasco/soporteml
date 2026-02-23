import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const MeliConnectionStatus = () => {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      // Check if meli_tokens exist for the user's company
      const { data: tokens } = await supabase
        .from('meli_tokens')
        .select('updated_at')
        .limit(1)
        .maybeSingle();

      setConnected(!!tokens);

      // Get latest question as proxy for last sync
      if (tokens) {
        const { data: latest } = await supabase
          .from('questions')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setLastSync(latest?.created_at ?? tokens.updated_at);
      }
    };
    fetch();
  }, []);

  if (connected === null) return null;

  return (
    <div className="flex items-center gap-2 text-xs">
      {connected ? (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-muted-foreground">
            MercadoLibre conectado
            {lastSync && (
              <> · última sync {formatDistanceToNow(new Date(lastSync), { addSuffix: true, locale: es })}</>
            )}
          </span>
        </>
      ) : (
        <>
          <XCircle className="w-3.5 h-3.5 text-destructive" />
          <span className="text-muted-foreground">MercadoLibre no conectado</span>
        </>
      )}
    </div>
  );
};

export default MeliConnectionStatus;
