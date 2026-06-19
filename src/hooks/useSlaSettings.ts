import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SlaSettings {
  targetMinutes: number;
  escalationEnabled: boolean;
}

const DEFAULT_SLA: SlaSettings = { targetMinutes: 60, escalationEnabled: true };

/**
 * Carga la configuración de SLA de la empresa actual.
 * Se refresca al cambiar `currentCompanyId`. No es realtime — los settings cambian rara vez.
 */
export const useSlaSettings = (): SlaSettings & { loading: boolean; refresh: () => Promise<void> } => {
  const { currentCompanyId } = useAuth();
  const [settings, setSettings] = useState<SlaSettings>(DEFAULT_SLA);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!currentCompanyId) {
      setSettings(DEFAULT_SLA);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('company_settings')
      .select('sla_target_minutes, sla_escalation_enabled')
      .eq('company_id', currentCompanyId)
      .maybeSingle();
    setSettings({
      targetMinutes: data?.sla_target_minutes ?? DEFAULT_SLA.targetMinutes,
      escalationEnabled: data?.sla_escalation_enabled ?? DEFAULT_SLA.escalationEnabled,
    });
    setLoading(false);
  }, [currentCompanyId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { ...settings, loading, refresh };
};