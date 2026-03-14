import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Save, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

export default ProfileSection;
