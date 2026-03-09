import { useState, useEffect, useCallback } from 'react';
import { computeHealth, getHealthUI } from '@/lib/meliTokenHealth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, XCircle, ExternalLink, Loader2, Unplug, Save, User, Building2, Link, Users, Bot, Copy, RefreshCw, Mail, UserPlus, Trash2, RotateCcw, Zap, Info, Bell, AlertTriangle, CreditCard, Crown } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const MELI_APP_ID = import.meta.env.VITE_MELI_APP_ID || '8921097700859218';

// ─── Profile Section ───
const ProfileSection = () => {
  const { user, profileName } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    if (profileName) setFullName(profileName);
  }, [profileName]);

  const handleSaveName = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id);
    toast(error
      ? { title: 'Error', description: error.message, variant: 'destructive' }
      : { title: 'Guardado', description: 'Nombre actualizado correctamente.' }
    );
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: 'Error', description: 'La contraseña debe tener al menos 8 caracteres.', variant: 'destructive' });
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      toast({ title: 'Error', description: 'La contraseña debe incluir al menos una letra mayúscula.', variant: 'destructive' });
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      toast({ title: 'Error', description: 'La contraseña debe incluir al menos un número.', variant: 'destructive' });
      return;
    }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    toast(error
      ? { title: 'Error', description: error.message, variant: 'destructive' }
      : { title: 'Contraseña actualizada', description: 'Tu contraseña fue cambiada exitosamente.' }
    );
    setNewPassword('');
    setChangingPw(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-sm">Perfil</CardTitle>
        </div>
        <CardDescription>Tu información personal</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={user?.email ?? ''} disabled className="bg-muted" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fullName">Nombre completo</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Tu nombre" className="flex-1" />
            <Button size="sm" onClick={handleSaveName} disabled={saving} className="w-full sm:w-auto">
              <Save className="w-4 h-4 mr-1" />{saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
        <Separator />
        <div className="space-y-2">
          <Label htmlFor="newPassword">Cambiar contraseña</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nueva contraseña" className="flex-1" />
            <Button size="sm" variant="outline" onClick={handleChangePassword} disabled={changingPw || !newPassword} className="w-full sm:w-auto">
              {changingPw ? 'Cambiando...' : 'Cambiar'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Join Company Section (Hito 5: existing users join via invite code) ───
const JoinCompanySection = () => {
  const { refreshMemberships, memberships } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('join_company_by_invite' as any, { _invite_code: code.trim() });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else if ((data as any)?.error) {
      toast({ title: 'Error', description: (data as any).error, variant: 'destructive' });
    } else {
      toast({ title: 'Empresa agregada', description: `Te uniste a "${(data as any).company_name}".` });
      setCode('');
      await refreshMemberships();
    }
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-sm">Unirse a otra empresa</CardTitle>
        </div>
        <CardDescription>Usá un código de invitación para acceder a otra empresa</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Código de invitación..."
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            className="font-mono text-sm"
          />
          <Button onClick={handleJoin} disabled={loading || !code.trim()} className="shrink-0">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Unirme
          </Button>
        </div>
        {memberships.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Empresas actuales: {memberships.length}. Un código válido agregará una nueva membresía sin modificar las existentes.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Company Section ───
const CompanySection = () => {
  const { currentCompanyId } = useAuth();
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (!currentCompanyId) { setLoading(false); return; }
    supabase.from('companies').select('name, invite_code').eq('id', currentCompanyId).single().then(({ data }) => {
      if (data) {
        setCompanyName(data.name);
        setInviteCode((data as any).invite_code ?? '');
      }
      setLoading(false);
    });
  }, [currentCompanyId]);

  const handleSave = async () => {
    if (!currentCompanyId || !companyName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('companies').update({ name: companyName.trim() }).eq('id', currentCompanyId);
    toast(error
      ? { title: 'Error', description: error.message, variant: 'destructive' }
      : { title: 'Guardado', description: 'Nombre de empresa actualizado.' }
    );
    setSaving(false);
  };

  const handleRegenerate = async () => {
    if (!currentCompanyId) return;
    setRegenerating(true);
    const arr = new Uint8Array(6);
    crypto.getRandomValues(arr);
    const newCode = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');

    const { error } = await supabase.from('companies').update({ invite_code: newCode } as any).eq('id', currentCompanyId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setInviteCode(newCode);
      toast({ title: 'Código regenerado', description: 'El código de invitación anterior ya no funcionará.' });
    }
    setRegenerating(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    toast({ title: 'Copiado', description: 'Código de invitación copiado al portapapeles.' });
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-sm">Empresa</CardTitle>
        </div>
        <CardDescription>Datos de tu organización</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">Nombre de la empresa</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="flex-1" />
            <Button size="sm" onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
              <Save className="w-4 h-4 mr-1" />{saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
        <Separator />
        <div className="space-y-2">
          <Label>Código de invitación</Label>
          <p className="text-xs text-muted-foreground">Compartí este código para que otros usuarios se unan a tu empresa.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input value={inviteCode} readOnly className="flex-1 font-mono bg-muted" />
            <Button size="sm" variant="outline" onClick={handleCopyCode} className="w-full sm:w-auto">
              Copiar
            </Button>
            <Button size="sm" variant="outline" onClick={handleRegenerate} disabled={regenerating} className="w-full sm:w-auto">
              {regenerating ? 'Regenerando...' : 'Regenerar'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Sync Button ───
const SyncButton = () => {
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    const { error } = await supabase.functions.invoke('sync-meli-questions');
    toast(error
      ? { title: 'Error', description: 'No se pudo sincronizar. Intentá de nuevo.', variant: 'destructive' }
      : { title: 'Sincronización completada', description: 'Las preguntas fueron actualizadas.' }
    );
    setSyncing(false);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
      <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
      {syncing ? 'Sincronizando...' : 'Forzar sincronización'}
    </Button>
  );
};

// ─── MeLi Connection Section ───
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
      supabase.from('meli_connection_status').select('meli_user_id, updated_at, expires_at, has_refresh_token').eq('company_id', currentCompanyId).maybeSingle(),
      supabase.from('company_settings').select('sync_interval_minutes').eq('company_id', currentCompanyId).maybeSingle(),
    ]);
    setTokenInfo(tokenRes.data ?? null);
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
    const { error } = await supabase.functions.invoke('disconnect-meli');
    if (error) {
      toast({ title: 'Error', description: 'No se pudo desconectar. Intentá de nuevo.', variant: 'destructive' });
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link className="w-4 h-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-sm">MercadoLibre</CardTitle>
              <CardDescription>Conectá tu cuenta para sincronizar preguntas automáticamente</CardDescription>
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

// ─── Team Section (Hito 5: membership-based) ───
const TeamSection = () => {
  const { currentCompanyId, user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<Array<{ user_id: string; full_name: string; role: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentCompanyId) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const [membersRes, companyRes] = await Promise.all([
        supabase.rpc('get_company_members' as any, { _company_id: currentCompanyId }),
        supabase.from('companies').select('invite_code').eq('id', currentCompanyId).single(),
      ]);

      if (companyRes.data) setInviteCode((companyRes.data as any).invite_code ?? '');

      setMembers(((membersRes.data ?? []) as any[]).map((m: any) => ({
        user_id: m.user_id,
        full_name: m.full_name || 'Sin nombre',
        role: m.role,
      })));
      setLoading(false);
    })();
  }, [currentCompanyId]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase.rpc('update_membership_role' as any, {
      _user_id: userId,
      _company_id: currentCompanyId,
      _new_role: newRole,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role: newRole } : m));
      toast({ title: 'Rol actualizado' });
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (userId === user?.id) {
      toast({ title: 'No podés quitarte a vos mismo', variant: 'destructive' });
      return;
    }
    setRemovingId(userId);
    const { error } = await supabase.rpc('remove_company_membership' as any, {
      _user_id: userId,
      _company_id: currentCompanyId,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setMembers(prev => prev.filter(m => m.user_id !== userId));
      toast({ title: 'Miembro removido de la empresa' });
    }
    setRemovingId(null);
  };

  const inviteLink = inviteCode ? `${window.location.origin}/signup?code=${inviteCode}` : '';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast({ title: 'Link copiado', description: 'Compartilo con la persona que querés invitar.' });
  };

  const handleSendEmail = () => {
    if (!inviteEmail.trim()) return;
    const subject = encodeURIComponent('Te invitaron a SoporteML');
    const body = encodeURIComponent(
      `¡Hola!\n\nFuiste invitado/a a unirte a nuestra empresa en SoporteML.\n\nHacé click en el siguiente link para crear tu cuenta:\n${inviteLink}\n\n¡Te esperamos!`
    );
    window.open(`mailto:${inviteEmail.trim()}?subject=${subject}&body=${body}`, '_blank');
    setInviteEmail('');
    toast({ title: 'Email preparado', description: 'Se abrió tu cliente de correo con la invitación.' });
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-sm">Equipo</CardTitle>
        </div>
        <CardDescription>Miembros de la empresa activa y sus roles</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Invite section */}
        {inviteCode && (
          <>
            <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <UserPlus className="w-4 h-4" />
                Invitar personas
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Link de invitación</Label>
                <div className="flex gap-2">
                  <Input value={inviteLink} readOnly className="flex-1 font-mono text-xs bg-muted" />
                  <Button size="sm" variant="outline" onClick={handleCopyLink}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Enviar por email</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@ejemplo.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button size="sm" variant="outline" onClick={handleSendEmail} disabled={!inviteEmail.trim()}>
                    <Mail className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Members list */}
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay miembros en esta empresa.</p>
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{m.full_name}</p>
                  {m.user_id === user?.id && <span className="text-xs text-muted-foreground">(tú)</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={m.role}
                    onValueChange={(v) => handleRoleChange(m.user_id, v)}
                    disabled={m.user_id === user?.id}
                  >
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="agent">Agente</SelectItem>
                    </SelectContent>
                  </Select>
                  {m.user_id !== user?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveMember(m.user_id)}
                      disabled={removingId === m.user_id}
                    >
                      {removingId === m.user_id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── AI Config Section ───
const AiConfigSection = () => {
  const { currentCompanyId } = useAuth();
  const { toast } = useToast();
  const [aiTone, setAiTone] = useState('profesional');
  const [aiInstructions, setAiInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentCompanyId) { setLoading(false); return; }
    supabase
      .from('company_settings')
      .select('ai_tone, ai_custom_instructions')
      .eq('company_id', currentCompanyId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAiTone(data.ai_tone || 'profesional');
          setAiInstructions(data.ai_custom_instructions || '');
        }
        setLoading(false);
      });
  }, [currentCompanyId]);

  const handleSave = async () => {
    if (!currentCompanyId) return;
    setSaving(true);

    const payload = {
      company_id: currentCompanyId,
      ai_tone: aiTone,
      ai_custom_instructions: aiInstructions.trim() || null,
    };

    const { error } = await supabase
      .from('company_settings')
      .upsert(payload, { onConflict: 'company_id' });

    toast(error
      ? { title: 'Error', description: error.message, variant: 'destructive' }
      : { title: 'Guardado', description: 'Configuración de IA actualizada.' }
    );
    setSaving(false);
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-sm">Configuración de IA</CardTitle>
        </div>
        <CardDescription>Personalizá cómo responde la IA a las preguntas de compradores</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Tono de respuestas</Label>
          <Select value={aiTone} onValueChange={setAiTone}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="profesional">Profesional</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="tecnico">Técnico</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="aiInstructions">Instrucciones adicionales</Label>
          <Textarea
            id="aiInstructions"
            value={aiInstructions}
            onChange={(e) => setAiInstructions(e.target.value.slice(0, 500))}
            placeholder="Ej: Siempre mencionar que hacemos envío gratis en CABA. No ofrecer descuentos."
            rows={4}
          />
          <p className="text-xs text-muted-foreground">{aiInstructions.length}/500 caracteres</p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-1" />{saving ? 'Guardando...' : 'Guardar configuración'}
        </Button>
      </CardContent>
    </Card>
  );
};

// ─── Auto Reply Section (Admins only) ───
const DAYS_OF_WEEK = [
  { key: 'lunes', label: 'Lun' },
  { key: 'martes', label: 'Mar' },
  { key: 'miércoles', label: 'Mié' },
  { key: 'jueves', label: 'Jue' },
  { key: 'viernes', label: 'Vie' },
  { key: 'sábado', label: 'Sáb' },
  { key: 'domingo', label: 'Dom' },
];

type AutoReplyMode = 'off' | 'always' | 'outside_business_hours';

interface BusinessHours {
  days: string[];
  start_time: string;
  end_time: string;
}

const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  days: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'],
  start_time: '09:00',
  end_time: '18:00',
};

const AutoReplySection = () => {
  const { currentCompanyId } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<AutoReplyMode>('off');
  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_BUSINESS_HOURS);
  const [exclusionRules, setExclusionRules] = useState('');
  const [autopilotAfterHours, setAutopilotAfterHours] = useState(false);
  const [autopilotInHours, setAutopilotInHours] = useState(false);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.85);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentCompanyId) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from('company_settings')
        .select('auto_reply_enabled, auto_reply_exclusion_rules, auto_reply_mode, business_hours, features_autopilot_after_hours, features_autopilot_in_hours, autopilot_confidence_threshold')
        .eq('company_id', currentCompanyId)
        .maybeSingle();

      if (data) {
        const d = data as any;
        if (d.auto_reply_mode && d.auto_reply_mode !== 'off') {
          setMode(d.auto_reply_mode as AutoReplyMode);
        } else if (d.auto_reply_enabled) {
          setMode('always');
        }
        if (d.business_hours) {
          setBusinessHours({ ...DEFAULT_BUSINESS_HOURS, ...d.business_hours });
        }
        setExclusionRules(d.auto_reply_exclusion_rules ?? '');
        setAutopilotAfterHours(d.features_autopilot_after_hours ?? false);
        setAutopilotInHours(d.features_autopilot_in_hours ?? false);
        setConfidenceThreshold(d.autopilot_confidence_threshold ?? 0.85);
      }
      setLoading(false);
    })();
  }, [currentCompanyId]);

  const handleSave = async () => {
    if (!currentCompanyId) return;
    setSaving(true);

    const { error } = await supabase
      .from('company_settings')
      .upsert({
        company_id: currentCompanyId,
        auto_reply_enabled: mode !== 'off',
        auto_reply_mode: mode,
        business_hours: businessHours,
        auto_reply_exclusion_rules: exclusionRules || null,
        features_autopilot_after_hours: autopilotAfterHours,
        features_autopilot_in_hours: autopilotInHours,
        autopilot_confidence_threshold: confidenceThreshold,
      } as any, { onConflict: 'company_id' });

    toast(error
      ? { title: 'Error', description: error.message, variant: 'destructive' }
      : { title: 'Guardado', description: 'Configuración de auto-respuesta actualizada.' }
    );
    setSaving(false);
  };

  const toggleDay = (day: string) => {
    setBusinessHours(prev => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day],
    }));
  };

  if (loading) return null;

  const isActive = mode !== 'off';

  const getActiveChip = () => {
    if (autopilotInHours && autopilotAfterHours) return { label: 'Auto siempre', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' };
    if (autopilotAfterHours) return { label: 'Auto fuera de horario', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
    if (isActive) return { label: 'Solo sugiere', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
    return null;
  };
  const chip = getActiveChip();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-sm">Autopilot & Auto-Respuesta</CardTitle>
              <CardDescription>Configurá cómo responde la IA automáticamente</CardDescription>
            </div>
          </div>
          {chip && (
            <Badge variant="outline" className={`text-xs ${chip.color}`}>
              {chip.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Bot className="w-4 h-4" />
            Autopilot
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ap-after" className="text-sm">Fuera de horario comercial</Label>
              <p className="text-xs text-muted-foreground">La IA responde automáticamente cuando estás cerrado.</p>
            </div>
            <Switch id="ap-after" checked={autopilotAfterHours} onCheckedChange={setAutopilotAfterHours} />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ap-in" className="text-sm">En horario comercial</Label>
              <p className="text-xs text-muted-foreground">La IA responde automáticamente incluso cuando estás abierto (solo si confidence es alta).</p>
            </div>
            <Switch id="ap-in" checked={autopilotInHours} onCheckedChange={setAutopilotInHours} />
          </div>
          
          {(autopilotAfterHours || autopilotInHours) && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Umbral de confianza</Label>
                <span className="text-sm font-mono text-foreground">{confidenceThreshold.toFixed(2)}</span>
              </div>
              <Slider
                value={[confidenceThreshold]}
                onValueChange={([v]) => setConfidenceThreshold(v)}
                min={0.5}
                max={1}
                step={0.05}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Solo se publican automáticamente respuestas con confidence ≥ {confidenceThreshold.toFixed(2)}. Valores más altos = más conservador.
              </p>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-sm">Modo legacy (compatibilidad)</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as AutoReplyMode)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">Desactivada</SelectItem>
              <SelectItem value="always">Siempre activa (24/7)</SelectItem>
              <SelectItem value="outside_business_hours">Solo fuera del horario comercial</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {mode === 'off' && 'Las respuestas nunca se publican automáticamente por modo legacy.'}
            {mode === 'always' && 'La IA responde automáticamente a todas las preguntas (sin evaluación de confidence).'}
            {mode === 'outside_business_hours' && 'La IA responde solo fuera del horario (sin evaluación de confidence).'}
          </p>
        </div>

        {(mode === 'outside_business_hours' || autopilotAfterHours) && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-sm">Horario comercial</Label>
              <p className="text-xs text-muted-foreground">
                Definí tu horario de atención. El autopilot fuera de horario funciona FUERA de este horario.
              </p>

              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleDay(key)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      businessHours.days.includes(key)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Desde</Label>
                  <Input
                    type="time"
                    value={businessHours.start_time}
                    onChange={(e) => setBusinessHours(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-28"
                  />
                </div>
                <span className="text-muted-foreground mt-5">—</span>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Hasta</Label>
                  <Input
                    type="time"
                    value={businessHours.end_time}
                    onChange={(e) => setBusinessHours(prev => ({ ...prev, end_time: e.target.value }))}
                    className="w-28"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {(isActive || autopilotAfterHours || autopilotInHours) && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-sm">Reglas de exclusión</Label>
              <p className="text-xs text-muted-foreground">
                Describí en texto libre qué tipo de consultas NO deben responderse automáticamente.
              </p>
              <Textarea
                value={exclusionRules}
                onChange={(e) => setExclusionRules(e.target.value)}
                placeholder="Ej: Toda consulta sobre compra, venta, negociación o trueque de vehículos y motos debe ser revisada por un humano."
                rows={4}
                className="text-sm"
              />
            </div>

            <div className="rounded-lg bg-muted/50 border border-border p-3 flex gap-2">
              <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                La IA analizará cada pregunta y decidirá si requiere intervención humana. Las que coincidan con estas reglas o no superen el umbral de confianza aparecerán en el <strong>Priority Inbox</strong>.
              </p>
            </div>
          </>
        )}

        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-1" />{saving ? 'Guardando...' : 'Guardar configuración'}
        </Button>
      </CardContent>
    </Card>
  );
};

// ─── Trash Section (Admins only) ───
const TrashSection = () => {
  const { companyId } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Array<{ id: string; meli_question_id: string; question_text: string; created_at: string; product_title?: string }>>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeleted = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('questions')
      .select('id, meli_question_id, question_text, created_at, product_id, products(title)')
      .eq('company_id', companyId)
      .eq('status', 'deleted')
      .order('created_at', { ascending: false });

    setItems((data ?? []).map((q: any) => ({
      id: q.id,
      meli_question_id: q.meli_question_id,
      question_text: q.question_text,
      created_at: q.created_at,
      product_title: q.products?.title,
    })));
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchDeleted(); }, [fetchDeleted]);

  const handleRestore = async (id: string) => {
    const { error } = await supabase.from('questions').update({ status: 'pending' }).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Restaurada', description: 'La pregunta volvió a pendientes.' });
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  const handlePermanentDelete = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (item && companyId) {
      await supabase.from('dismissed_meli_questions' as any).insert({
        meli_question_id: item.meli_question_id,
        company_id: companyId,
      });
    }
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Eliminada', description: 'La pregunta fue eliminada definitivamente.' });
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  const handleEmptyTrash = async () => {
    if (!companyId) return;
    const dismissedRows = items.map(i => ({
      meli_question_id: i.meli_question_id,
      company_id: companyId,
    }));
    await supabase.from('dismissed_meli_questions' as any).upsert(dismissedRows, { onConflict: 'meli_question_id,company_id' });

    const ids = items.map(i => i.id);
    const { error } = await supabase.from('questions').delete().in('id', ids);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Papelera vaciada', description: 'Todas las preguntas fueron eliminadas definitivamente.' });
      setItems([]);
    }
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-muted-foreground" />
            <div>
              <CardTitle className="text-sm">Papelera</CardTitle>
              <CardDescription>Preguntas eliminadas ({items.length})</CardDescription>
            </div>
          </div>
          {items.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  Vaciar papelera
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Vaciar papelera?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se eliminarán permanentemente {items.length} pregunta(s). Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEmptyTrash} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Sí, vaciar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">La papelera está vacía.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 py-2 border-b border-border/50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{item.question_text}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.product_title ?? 'Sin producto'} · {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRestore(item.id)} title="Restaurar">
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Eliminar definitivamente">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar definitivamente?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta pregunta será eliminada permanentemente de la base de datos. No se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handlePermanentDelete(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Sí, eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Notifications Section ───
const NOTIF_KEY = 'soporteml_push_enabled';

const NotificationsSection = () => {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(() => {
    return localStorage.getItem(NOTIF_KEY) !== 'false';
  });
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>(
    'Notification' in window ? Notification.permission : 'unsupported'
  );

  const handleToggle = async (checked: boolean) => {
    if (checked && permissionState === 'default') {
      const result = await Notification.requestPermission();
      setPermissionState(result);
      if (result === 'denied') {
        toast({ title: 'Permiso denegado', description: 'Habilitá las notificaciones desde la configuración de tu navegador.', variant: 'destructive' });
        return;
      }
    }

    if (checked && permissionState === 'denied') {
      toast({ title: 'Permiso bloqueado', description: 'Desbloqueá las notificaciones desde la configuración de tu navegador para este sitio.', variant: 'destructive' });
      return;
    }

    localStorage.setItem(NOTIF_KEY, String(checked));
    setEnabled(checked);
    toast({ title: checked ? 'Notificaciones activadas' : 'Notificaciones desactivadas' });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-sm">Notificaciones</CardTitle>
        </div>
        <CardDescription>Alertas del navegador cuando llegan preguntas nuevas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-toggle" className="text-sm">Notificaciones push</Label>
            <p className="text-xs text-muted-foreground">Recibí alertas incluso cuando la pestaña no está activa.</p>
          </div>
          <Switch
            id="push-toggle"
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={permissionState === 'unsupported'}
          />
        </div>
        {permissionState === 'denied' && (
          <p className="text-xs text-destructive">
            Las notificaciones están bloqueadas por el navegador. Desbloqueálas desde la configuración del sitio.
          </p>
        )}
        {permissionState === 'unsupported' && (
          <p className="text-xs text-muted-foreground">
            Tu navegador no soporta notificaciones push.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Billing Section ───
const PLANS = {
  base: {
    name: 'Plan Base',
    price_id: 'price_1T7faRHxJMYe1KhU6WFMGZBE',
    product_id: 'prod_U5rJedcU19HeK3',
    price: 100,
    features: ['Copiloto IA', 'CRM de productos', 'Conexión MercadoLibre', 'Hasta 3 usuarios'],
  },
  pro: {
    name: 'Plan Pro',
    price_id: null,
    product_id: null,
    price: 200,
    features: ['Todo del Plan Base', 'Respuestas automáticas', 'Usuarios ilimitados', 'SLA y reportes'],
  },
};

const BillingSection = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [subscription, setSubscription] = useState<{ subscribed: boolean; product_id?: string; subscription_end?: string } | null>(null);

  const isSuperAdmin = user?.email === 'gonzoblasco@icloud.com';

  const checkSubscription = useCallback(async () => {
    if (isSuperAdmin) {
      setSubscription({ subscribed: true, product_id: '__super_admin__' });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      setSubscription(data);
    } catch {
      setSubscription({ subscribed: false });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkSubscription();
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      setTimeout(checkSubscription, 2000);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [checkSubscription]);

  useEffect(() => {
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  const handleCheckout = async () => {
    setCheckingOut(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'No se pudo iniciar el checkout.', variant: 'destructive' });
    }
    setCheckingOut(false);
  };

  const handleManage = async () => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'No se pudo abrir el portal.', variant: 'destructive' });
    }
    setOpeningPortal(false);
  };

  const isSubscribed = subscription?.subscribed;
  const currentPlan = isSuperAdmin ? 'super_admin' : (isSubscribed && subscription?.product_id === PLANS.base.product_id ? 'base' : null);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-sm">Plan y facturación</CardTitle>
        </div>
        <CardDescription>Gestioná tu suscripción</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />Verificando suscripción...
          </div>
        ) : (
          <>
            {isSubscribed ? (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                <Crown className="w-4 h-4 text-emerald-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {currentPlan === 'super_admin' ? '⚡ Super Admin — Acceso total' : currentPlan === 'base' ? 'Plan Base' : 'Suscripción activa'}
                  </p>
                  {subscription?.subscription_end && (
                    <p className="text-xs text-muted-foreground">
                      Próxima renovación: {new Date(subscription.subscription_end).toLocaleDateString('es-AR')}
                    </p>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={handleManage} disabled={openingPortal}>
                  {openingPortal ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ExternalLink className="w-3 h-3 mr-1" />}
                  Gestionar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
                <Info className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground flex-1">No tenés una suscripción activa.</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={`rounded-lg border p-4 space-y-3 ${currentPlan === 'base' ? 'border-primary ring-1 ring-primary/20' : 'border-border'}`}>
                {currentPlan === 'base' && (
                  <Badge variant="default" className="text-xs">Tu plan actual</Badge>
                )}
                <div>
                  <p className="font-semibold text-foreground">{PLANS.base.name}</p>
                  <p className="text-2xl font-bold text-foreground">${PLANS.base.price}<span className="text-sm font-normal text-muted-foreground">/mes</span></p>
                </div>
                <ul className="space-y-1">
                  {PLANS.base.features.map(f => (
                    <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                {!isSubscribed && (
                  <Button size="sm" className="w-full" onClick={handleCheckout} disabled={checkingOut}>
                    {checkingOut ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    Suscribirme
                  </Button>
                )}
              </div>

              <div className="rounded-lg border border-border p-4 space-y-3 opacity-60">
                <Badge variant="secondary" className="text-xs">Próximamente</Badge>
                <div>
                  <p className="font-semibold text-foreground">{PLANS.pro.name}</p>
                  <p className="text-2xl font-bold text-foreground">${PLANS.pro.price}<span className="text-sm font-normal text-muted-foreground">/mes</span></p>
                </div>
                <ul className="space-y-1">
                  {PLANS.pro.features.map(f => (
                    <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-muted-foreground/50 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Button size="sm" variant="ghost" onClick={checkSubscription} className="text-xs">
              <RefreshCw className="w-3 h-3 mr-1" />Verificar estado
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Settings Page ───
const SettingsPage = () => {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl font-semibold text-foreground mb-1">Settings</h1>
        <p className="text-sm text-muted-foreground mb-6">Configuración de la cuenta y preferencias</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <ProfileSection />
            <JoinCompanySection />
            <BillingSection />
            <NotificationsSection />
            {isAdmin && <CompanySection />}
            {isAdmin && <MeliConnectionSection />}
          </div>
          {isAdmin && (
            <div className="space-y-4">
              <TeamSection />
              <AiConfigSection />
              <AutoReplySection />
              <TrashSection />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
