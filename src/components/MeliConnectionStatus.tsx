import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle } from 'lucide-react';

const MeliConnectionStatus = () => {
  const [connected, setConnected] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadStatus = async () => {
      const { data: tokens } = await supabase
        .from('meli_tokens')
        .select('id')
        .limit(1)
        .maybeSingle();
      setConnected(!!tokens);
    };
    loadStatus();
  }, []);

  if (connected === null) return null;

  return (
    <button
      onClick={() => navigate('/settings')}
      className="flex items-center gap-2 text-xs hover:opacity-80 transition-opacity"
    >
      {connected ? (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-muted-foreground">Mercado Libre conectado</span>
        </>
      ) : (
        <>
          <XCircle className="w-3.5 h-3.5 text-destructive" />
          <span className="text-muted-foreground">MercadoLibre no conectado</span>
        </>
      )}
    </button>
  );
};

export default MeliConnectionStatus;
