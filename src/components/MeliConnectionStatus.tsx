import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { computeHealth, getHealthUI, type MeliHealthInfo } from '@/lib/meliTokenHealth';
import { useAuth } from '@/contexts/AuthContext';

const MeliConnectionStatus = () => {
  const [healthInfo, setHealthInfo] = useState<MeliHealthInfo>({ status: null });
  const navigate = useNavigate();
  const { currentCompanyId } = useAuth();

  useEffect(() => {
    if (!currentCompanyId) { setHealthInfo({ status: null }); return; }
    const loadStatus = async () => {
      const { data } = await supabase.rpc('get_meli_connection_status', { _company_id: currentCompanyId });
      const token = data?.[0] ?? null;
      setHealthInfo(computeHealth(token));
    };
    loadStatus();
  }, [currentCompanyId]);

  if (healthInfo.status === null) return null;

  const ui = getHealthUI(healthInfo.status);

  const iconMap = {
    green: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
    amber: <RefreshCw className="w-3.5 h-3.5 text-amber-500" />,
    red: <XCircle className="w-3.5 h-3.5 text-destructive" />,
    muted: <XCircle className="w-3.5 h-3.5 text-muted-foreground" />,
  };

  const textColorMap = {
    green: 'text-muted-foreground',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-destructive',
    muted: 'text-muted-foreground',
  };

  return (
    <button
      onClick={() => navigate('/settings')}
      className="flex items-center gap-2 text-xs hover:opacity-80 transition-opacity"
      title={ui.description}
    >
      {iconMap[ui.color]}
      <span className={textColorMap[ui.color]}>{ui.label}</span>
    </button>
  );
};

export default MeliConnectionStatus;
