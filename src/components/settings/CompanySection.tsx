import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

export default CompanySection;
