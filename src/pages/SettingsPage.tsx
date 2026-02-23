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
import { CheckCircle2, XCircle, ExternalLink, Loader2, Unplug, Save, User, Building2, Link, Users, Bot } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const MELI_APP_ID = '8921097700859218';

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
          <div className="flex gap-2">
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Tu nombre" />
            <Button size="sm" onClick={handleSaveName} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />{saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
        <Separator />
        <div className="space-y-2">
          <Label htmlFor="newPassword">Cambiar contraseña</Label>
          <div className="flex gap-2">
            <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nueva contraseña" />
            <Button size="sm" variant="outline" onClick={handleChangePassword} disabled={changingPw || !newPassword}>
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    supabase.from('companies').select('name').eq('id', companyId).single().then(({ data }) => {
      if (data) setCompanyName(data.name);
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
      <CardContent>
        <div className="space-y-2">
          <Label htmlFor="companyName">Nombre de la empresa</Label>
          <div className="flex gap-2">
            <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-1" />{saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── MeLi Connection Section ───
const MeliConnectionSection = () => {
  const { companyId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tokenInfo, setTokenInfo] = useState<{ meli_user_id: string; updated_at: string } | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    setLoading(true);
    const { data: token } = await supabase
      .from('meli_tokens')
      .select('meli_user_id, updated_at')
      .eq('company_id', companyId)
      .maybeSingle();
    setTokenInfo(token ?? null);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleConnect = () => {
    if (!companyId) {
      toast({ title: 'Error', description: 'No se encontró una empresa asociada.', variant: 'destructive' });
      return;
    }
    const redirectUri = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meli-oauth-callback`;
    const authUrl = `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${MELI_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${companyId}`;
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

  const isConnected = !!tokenInfo;

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
          {!loading && (
            <Badge variant={isConnected ? 'default' : 'secondary'} className={isConnected ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/10' : ''}>
              {isConnected ? (<><CheckCircle2 className="w-3 h-3 mr-1" /> Conectado</>) : (<><XCircle className="w-3 h-3 mr-1" /> Desconectado</>)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />Cargando estado...
          </div>
        ) : isConnected ? (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Seller ID: <span className="font-mono text-foreground">{tokenInfo.meli_user_id}</span></p>
              <p>Última actualización: {formatDistanceToNow(new Date(tokenInfo.updated_at), { addSuffix: true, locale: es })}</p>
            </div>
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
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Al conectar tu cuenta, las preguntas de tus publicaciones se importarán automáticamente cada 5 minutos con respuestas sugeridas por IA.
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

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    (async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('company_id', companyId);

      if (!profiles) { setLoading(false); return; }

      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const roleMap = new Map((roles ?? []).map(r => [r.user_id, r.role]));
      setMembers(profiles.map(p => ({
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
      // Maybe no row exists, try upsert
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
      <CardContent>
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

// ─── Settings Page ───
const SettingsPage = () => {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';

  return (
    <div className="p-6 h-screen overflow-y-auto">
      <h1 className="text-xl font-semibold text-foreground mb-2">Settings</h1>
      <p className="text-sm text-muted-foreground mb-6">Configuración de la cuenta y preferencias</p>

      <div className="space-y-4 max-w-2xl">
        <ProfileSection />
        {isAdmin && <CompanySection />}
        {isAdmin && <MeliConnectionSection />}
        {isAdmin && <TeamSection />}
        {isAdmin && <AiConfigSection />}
      </div>
    </div>
  );
};

export default SettingsPage;
