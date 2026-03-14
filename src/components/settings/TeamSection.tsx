import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Users, Copy, Mail, UserPlus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

export default TeamSection;
