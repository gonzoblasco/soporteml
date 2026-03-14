import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

export default JoinCompanySection;
