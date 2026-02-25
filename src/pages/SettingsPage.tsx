import { useState, useEffect, useCallback } from 'react';
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
import { CheckCircle2, XCircle, ExternalLink, Loader2, Unplug, Save, User, Building2, Link, Users, Bot, Copy, RefreshCw, Mail, UserPlus, Trash2, RotateCcw, Zap, Info, Bell, AlertTriangle } from 'lucide-react';
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
    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'La contraseña debe tener al menos 6 caracteres.', variant: 'destructive' });
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

// ─── Company Section ───
const CompanySection = () => {
  const { companyId } = useAuth();
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    supabase.from('companies').select('name, invite_code').eq('id', companyId).single().then(({ data }) => {
      if (data) {
        setCompanyName(data.name);
        setInviteCode((data as any).invite_code ?? '');
      }
      setLoading(false);
    });
  }, [companyId]);

  const handleSave = async () => {
    if (!companyId || !companyName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('companies').update({ name: companyName.trim() }).eq('id', companyId);
    toast(error
      ? { title: 'Error', description: error.message, variant: 'destructive' }
      : { title: 'Guardado', description: 'Nombre de empresa actualizado.' }
    );
    setSaving(false);
  };

  const handleRegenerate = async () => {
    if (!companyId) return;
    setRegenerating(true);
    // Generate a new random hex code client-side
    const arr = new Uint8Array(6);
    crypto.getRandomValues(arr);
    const newCode = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');

    const { error } = await supabase.from('companies').update({ invite_code: newCode } as any).eq('id', companyId);
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
  const { companyId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tokenInfo, setTokenInfo] = useState<{ meli_user_id: string; updated_at: string; expires_at: string; refresh_token: string | null } | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [syncInterval, setSyncInterval] = useState<number>(15);
  const [savingInterval, setSavingInterval] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    const [tokenRes, settingsRes] = await Promise.all([
      supabase.from('meli_tokens').select('meli_user_id, updated_at, expires_at, refresh_token').eq('company_id', companyId).maybeSingle(),
      supabase.from('company_settings').select('sync_interval_minutes').eq('company_id', companyId).maybeSingle(),
    ]);
    setTokenInfo(tokenRes.data ?? null);
    if (settingsRes.data?.sync_interval_minutes) {
      setSyncInterval(settingsRes.data.sync_interval_minutes);
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleConnect = async () => {
    if (!companyId) {
      toast({ title: 'Error', description: 'No se encontró una empresa asociada.', variant: 'destructive' });
      return;
    }

    // Generate PKCE code_verifier and code_challenge
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

    // Encode company_id + code_verifier in state (separated by |)
    const statePayload = `${companyId}|${codeVerifier}`;

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
      .upsert({ company_id: companyId!, sync_interval_minutes: minutes }, { onConflict: 'company_id' });
    toast(error
      ? { title: 'Error', description: error.message, variant: 'destructive' }
      : { title: 'Frecuencia actualizada', description: `La sincronización se ejecutará cada ${minutes} minutos.` }
    );
    setSavingInterval(false);
  };

  const isConnected = !!tokenInfo;

  // Compute token health for badge
  const tokenHealth = (() => {
    if (!tokenInfo) return 'disconnected';
    const now = Date.now();
    const expiresAt = new Date(tokenInfo.expires_at).getTime();
    const minutesLeft = Math.round((expiresAt - now) / 60000);
    if (!tokenInfo.refresh_token) return 'no_refresh';
    if (expiresAt <= now) return 'expired';
    if (minutesLeft <= 30) return 'expiring_soon';
    return 'connected';
  })();

  const healthBadge = () => {
    if (loading) return null;
    switch (tokenHealth) {
      case 'connected':
        return <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10"><CheckCircle2 className="w-3 h-3 mr-1" /> Conectado</Badge>;
      case 'expiring_soon':
        return <Badge variant="default" className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/10"><RefreshCw className="w-3 h-3 mr-1" /> Expira pronto</Badge>;
      case 'expired':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" /> Expirado</Badge>;
      case 'no_refresh':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Reconexión necesaria</Badge>;
      default:
        return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" /> Desconectado</Badge>;
    }
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
            {tokenHealth === 'no_refresh' && (
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                <XCircle className="w-4 h-4 shrink-0" />
                <span>Sin refresh token — reconectá MercadoLibre para restaurar la renovación automática.</span>
              </div>
            )}
            {tokenHealth === 'expired' && (
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Token expirado — se renovará automáticamente en el próximo sync.</span>
              </div>
            )}
            {tokenHealth === 'expiring_soon' && (
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-sm text-amber-600 dark:text-amber-400">
                <RefreshCw className="w-4 h-4 shrink-0" />
                <span>Token próximo a expirar — se renovará automáticamente.</span>
              </div>
            )}
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Seller ID: <span className="font-mono text-foreground">{tokenInfo.meli_user_id}</span></p>
              <p>Última actualización: {formatDistanceToNow(new Date(tokenInfo.updated_at), { addSuffix: true, locale: es })}</p>
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
            <div className="flex gap-2">
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
            {!companyId ? (
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

// ─── Team Section ───
const TeamSection = () => {
  const { companyId, user } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<Array<{ id: string; full_name: string | null; role: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    (async () => {
      const [{ data: profiles }, { data: roles }, { data: company }] = await Promise.all([
        supabase.from('profiles').select('id, full_name').eq('company_id', companyId),
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('companies').select('invite_code').eq('id', companyId).single(),
      ]);

      if (company) setInviteCode((company as any).invite_code ?? '');

      const roleMap = new Map((roles ?? []).map(r => [r.user_id, r.role]));
      setMembers((profiles ?? []).map(p => ({
        id: p.id,
        full_name: p.full_name,
        role: roleMap.get(p.id) ?? 'agent',
      })));
      setLoading(false);
    })();
  }, [companyId]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole as 'admin' | 'agent' })
      .eq('user_id', userId);

    if (error) {
      const { error: upsertErr } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: newRole as 'admin' | 'agent' }, { onConflict: 'user_id' });

      if (upsertErr) {
        toast({ title: 'Error', description: upsertErr.message, variant: 'destructive' });
        return;
      }
    }

    setMembers(prev => prev.map(m => m.id === userId ? { ...m, role: newRole } : m));
    toast({ title: 'Rol actualizado' });
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
        <CardDescription>Miembros de tu empresa y sus roles</CardDescription>
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
          <div className="space-y-3">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{m.full_name || 'Sin nombre'}</p>
                  {m.id === user?.id && <span className="text-xs text-muted-foreground">(tú)</span>}
                </div>
                <Select
                  value={m.role}
                  onValueChange={(v) => handleRoleChange(m.id, v)}
                  disabled={m.id === user?.id}
                >
                  <SelectTrigger className="w-28 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="agent">Agente</SelectItem>
                  </SelectContent>
                </Select>
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
  const { companyId } = useAuth();
  const { toast } = useToast();
  const [aiTone, setAiTone] = useState('profesional');
  const [aiInstructions, setAiInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    supabase
      .from('company_settings')
      .select('ai_tone, ai_custom_instructions')
      .eq('company_id', companyId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setAiTone(data.ai_tone || 'profesional');
          setAiInstructions(data.ai_custom_instructions || '');
        }
        setLoading(false);
      });
  }, [companyId]);

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);

    const payload = {
      company_id: companyId,
      ai_tone: aiTone,
      ai_custom_instructions: aiInstructions.trim() || null,
    };

    // Upsert
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
  const { companyId } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<AutoReplyMode>('off');
  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_BUSINESS_HOURS);
  const [exclusionRules, setExclusionRules] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from('company_settings')
        .select('auto_reply_enabled, auto_reply_exclusion_rules, auto_reply_mode, business_hours')
        .eq('company_id', companyId)
        .maybeSingle();

      if (data) {
        const d = data as any;
        // Migration compat: if auto_reply_mode exists use it, else derive from enabled flag
        if (d.auto_reply_mode && d.auto_reply_mode !== 'off') {
          setMode(d.auto_reply_mode as AutoReplyMode);
        } else if (d.auto_reply_enabled) {
          setMode('always');
        }
        if (d.business_hours) {
          setBusinessHours({ ...DEFAULT_BUSINESS_HOURS, ...d.business_hours });
        }
        setExclusionRules(d.auto_reply_exclusion_rules ?? '');
      }
      setLoading(false);
    })();
  }, [companyId]);

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);

    const { error } = await supabase
      .from('company_settings')
      .upsert({
        company_id: companyId,
        auto_reply_enabled: mode !== 'off',
        auto_reply_mode: mode,
        business_hours: businessHours,
        auto_reply_exclusion_rules: exclusionRules || null,
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-muted-foreground" />
          <div>
            <CardTitle className="text-sm">Auto-Respuesta</CardTitle>
            <CardDescription>Publicá respuestas de IA automáticamente en MercadoLibre</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode selector */}
        <div className="space-y-2">
          <Label className="text-sm">Modo de funcionamiento</Label>
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
            {mode === 'off' && 'Las respuestas nunca se publican automáticamente.'}
            {mode === 'always' && 'La IA responde automáticamente a todas las preguntas, las 24 horas.'}
            {mode === 'outside_business_hours' && 'La IA responde solo cuando estás fuera del horario comercial definido.'}
          </p>
        </div>

        {/* Business hours panel */}
        {mode === 'outside_business_hours' && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-sm">Horario comercial</Label>
              <p className="text-xs text-muted-foreground">
                Definí tu horario de atención. La auto-respuesta funcionará FUERA de este horario.
              </p>

              {/* Days checkboxes */}
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

              {/* Time range */}
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

        {/* Exclusion rules - shown when active */}
        {isActive && (
          <>
            <Separator />
            <div className="space-y-3">
              <Label className="text-sm">Reglas de exclusión</Label>
              <p className="text-xs text-muted-foreground">
                Describí en texto libre qué tipo de consultas NO deben responderse automáticamente. La IA evaluará cada pregunta y derivará las que coincidan al Priority Inbox para revisión humana.
              </p>
              <Textarea
                value={exclusionRules}
                onChange={(e) => setExclusionRules(e.target.value)}
                placeholder="Ej: Toda consulta sobre compra, venta, negociación o trueque de vehículos y motos debe ser revisada por un humano. También excluir regateos de precio y solicitudes de financiamiento."
                rows={4}
                className="text-sm"
              />
            </div>

            <div className="rounded-lg bg-muted/50 border border-border p-3 flex gap-2">
              <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                La IA analizará cada pregunta y decidirá si requiere intervención humana. Las que coincidan con estas reglas aparecerán en el <strong>Priority Inbox</strong> para que un agente las revise.
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
    // Register all meli_question_ids in blacklist before deleting
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
    return localStorage.getItem(NOTIF_KEY) !== 'false'; // default true
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
