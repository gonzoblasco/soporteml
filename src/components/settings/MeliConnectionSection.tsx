import { useState, useEffect, useCallback } from 'react';
import { computeHealth, getHealthUI } from '@/lib/meliTokenHealth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase-init';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle2, XCircle, ExternalLink, Loader2, Unplug, Link, RefreshCw, RotateCcw, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const MELI_APP_ID = import.meta.env.VITE_MELI_APP_ID || '8921097700859218';

const SyncButton = () => {
  const { toast } = useToast();
  const { currentCompanyId } = useAuth();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    const { error, data } = await supabase.functions.invoke('sync-meli-questions', {
      body: { company_id: currentCompanyId },
    });
    if (error) {
      const msg = data?.error || error.message || 'No se pudo sincronizar. Intentá de nuevo.';
      toast({ title: 'Error de sincronización', description: msg, variant: 'destructive' });
    } else {
      toast({ title: 'Sincronización completada', description: 'Las preguntas fueron actualizadas.' });
    }
    setSyncing(false);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
      <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
      {syncing ? 'Sincronizando...' : 'Forzar sincronización'}
    </Button>
  );
};

const MeliConnectionSection = () => {
  const { currentCompanyId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tokenInfo, setTokenInfo] = useState<{ meli_user_id: string; updated_at: string; expires_at: string; has_refresh_token: boolean } | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncInterval, setSyncInterval] = useState<number>(15);
  const [savingInterval, setSavingInterval] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!currentCompanyId) { setLoading(false); return; }
    setLoading(true);
    const [tokenRes, settingsRes] = await Promise.all([
      supabase.rpc('get_meli_connection_status', { _company_id: currentCompanyId }),
      supabase.from('company_settings').select('sync_interval_minutes').eq('company_id', currentCompanyId).maybeSingle(),
    ]);
    const rows = tokenRes.data as any[];
    setTokenInfo(rows && rows.length > 0 ? rows[0] : null);
    if (settingsRes.data?.sync_interval_minutes) {
      setSyncInterval(settingsRes.data.sync_interval_minutes);
    }
    setLoading(false);
  }, [currentCompanyId]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleConnect = async () => {
    if (!currentCompanyId) {
      toast({ title: 'Error', description: 'No se encontró una empresa asociada.', variant: 'destructive' });
      return;
    }

    const generateCodeVerifier = () => {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      return btoa(String.fromCharCode(...array))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };

    const generateCodeChallenge = async (verifier: string) => {
      const encoder = new TextEncoder();
      const data = encoder.encode(verifier);
      const digest = await crypto.subtle.digest('SHA-256', data);
      return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const statePayload = `${currentCompanyId}|${codeVerifier}`;

    const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meli-oauth-callback`;
    const authUrl = `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${MELI_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(statePayload)}&scope=offline_access%20read%20write&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    const popup = window.open(authUrl, 'meli_oauth', 'width=600,height=700');
    const interval = setInterval(() => {
      if (!popup || popup.closed) { clearInterval(interval); fetchStatus(); }
    }, 1000);
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    const { error, data } = await supabase.functions.invoke('disconnect-meli', {
      body: { company_id: currentCompanyId },
    });
    if (error) {
      const msg = data?.error || error.message || 'No se pudo desconectar. Intentá de nuevo.';
      toast({ title: 'Error al desconectar', description: msg, variant: 'destructive' });
    } else {
      toast({ title: 'Desconectado', description: 'Tu cuenta de MercadoLibre fue desconectada.' });
      setTokenInfo(null);
    }
    setDisconnecting(false);
  };

  const handleIntervalChange = async (value: string) => {
    const minutes = parseInt(value, 10);
    setSyncInterval(minutes);
    setSavingInterval(true);
    const { error } = await supabase
      .from('company_settings')
      .upsert({ company_id: currentCompanyId!, sync_interval_minutes: minutes }, { onConflict: 'company_id' });
    toast(error
      ? { title: 'Error', description: error.message, variant: 'destructive' }
      : { title: 'Frecuencia actualizada', description: `La sincronización se ejecutará cada ${minutes} minutos.` }
    );
    setSavingInterval(false);
  };

  const isConnected = !!tokenInfo;

  const healthInfo = computeHealth(tokenInfo);
  const healthUI = getHealthUI(healthInfo.status);

  const healthBadge = () => {
    if (loading) return null;
    const badgeMap: Record<string, JSX.Element> = {
      green: <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10"><CheckCircle2 className="w-3 h-3 mr-1" /> {healthUI.label}</Badge>,
      amber: <Badge variant="default" className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/10"><RefreshCw className="w-3 h-3 mr-1" /> {healthUI.label}</Badge>,
      red: <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> {healthUI.label}</Badge>,
      muted: <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" /> {healthUI.label}</Badge>,
    };
    return badgeMap[healthUI.color] ?? null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-sm">MercadoLibre</CardTitle>
              <CardDescription className="hidden sm:block">Conectá tu cuenta para sincronizar preguntas automáticamente</CardDescription>
            </div>
          </div>
          {healthBadge()}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />Cargando estado...
          </div>
        ) : isConnected ? (
          <div className="space-y-3">
            {healthUI.color !== 'green' && healthInfo.status !== 'disconnected' && (
              <div className={`flex items-start gap-2 p-2.5 rounded-md border text-sm ${
                healthUI.color === 'red' 
                  ? 'bg-destructive/10 border-destructive/20 text-destructive'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
              }`}>
                {healthUI.color === 'red' ? <XCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
                <div>
                  <p className="font-medium text-sm">{healthUI.label}</p>
                  <p className="text-xs mt-0.5 opacity-80">{healthUI.description}</p>
                </div>
              </div>
            )}
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Seller ID: <span className="font-mono text-foreground">{tokenInfo!.meli_user_id}</span></p>
              <p>Última renovación: {formatDistanceToNow(new Date(tokenInfo!.updated_at), { addSuffix: true, locale: es })}</p>
              <p>Expira {(() => {
                const expiresMs = new Date(tokenInfo!.expires_at).getTime() - Date.now();
                if (expiresMs <= 0) return <span className="text-destructive font-medium">expirado</span>;
                const mins = Math.round(expiresMs / 60000);
                if (mins < 60) return <span className={mins <= 5 ? 'text-destructive font-medium' : 'text-foreground'}>en {mins} min</span>;
                const hrs = Math.round(mins / 60);
                return <span className="text-foreground">en {hrs}h</span>;
              })()}</p>
              <p>Refresh token: {tokenInfo!.has_refresh_token 
                ? <span className="text-emerald-600">✓ disponible</span> 
                : <span className="text-destructive">✗ no disponible</span>}
              </p>
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label className="text-sm">Frecuencia de sincronización</Label>
              <p className="text-xs text-muted-foreground">Cada cuántos minutos se buscan preguntas nuevas automáticamente.</p>
              <Select value={String(syncInterval)} onValueChange={handleIntervalChange} disabled={savingInterval}>
                <SelectTrigger className="w-48 h-8 text-sm">
                  {savingInterval ? <Loader2 className="w-3 h-3 animate-spin" /> : <SelectValue />}
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Cada 5 minutos</SelectItem>
                  <SelectItem value="15">Cada 15 minutos</SelectItem>
                  <SelectItem value="30">Cada 30 minutos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex flex-wrap gap-2">
              {healthInfo.status === 'expired_with_refresh' && (
                <Button variant="outline" size="sm" onClick={async () => {
                  toast({ title: 'Renovando token...', description: 'Se está intentando renovar el token automáticamente.' });
                  const { error } = await supabase.functions.invoke('sync-meli-questions');
                  if (error) {
                    toast({ title: 'Error de renovación', description: 'No se pudo renovar el token. Intentá reconectar MercadoLibre.', variant: 'destructive' });
                  } else {
                    toast({ title: 'Renovación exitosa', description: 'El token fue renovado correctamente.' });
                    fetchStatus();
                  }
                }}>
                  <RotateCcw className="w-4 h-4 mr-2" />Reintentar renovación
                </Button>
              )}
              <SyncButton />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={disconnecting}>
                    <Unplug className="w-4 h-4 mr-2" />{disconnecting ? 'Desconectando...' : 'Desconectar'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Desconectar MercadoLibre?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esto eliminará la conexión con tu cuenta de MercadoLibre. Las preguntas ya importadas se mantendrán, pero dejará de sincronizar nuevas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDisconnect} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Sí, desconectar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Al conectar tu cuenta, las preguntas de tus publicaciones se importarán automáticamente con respuestas sugeridas por IA.
            </p>
            {!currentCompanyId ? (
              <p className="text-sm text-destructive">Tu cuenta no tiene una empresa asociada. Contactá al administrador.</p>
            ) : (
              <Button size="sm" onClick={handleConnect}>
                <ExternalLink className="w-4 h-4 mr-2" />Conectar MercadoLibre
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MeliConnectionSection;
