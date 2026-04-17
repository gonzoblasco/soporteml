import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { Loader2, MessageSquare, Building2, Users } from 'lucide-react';
import { toast } from 'sonner';

const PostGoogleSetup = () => {
  const { user, isLoading, currentCompanyId, refreshMemberships, logout } = useAuth();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [companyName, setCompanyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill empresa name con algo basado en el nombre del user (opcional)
  useEffect(() => {
    if (user?.user_metadata?.full_name && !companyName) {
      const first = user.user_metadata.full_name.split(' ')[0];
      setCompanyName(`${first}`);
    }
  }, [user, companyName]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (currentCompanyId) return <Navigate to="/dashboard" replace />;

  const handleCreate = async () => {
    if (!companyName.trim()) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc('create_company_for_user', {
      _company_name: companyName.trim(),
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    const result = data as { error?: string; success?: boolean; company_name?: string };
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Empresa "${result.company_name}" creada`);
    await refreshMemberships();
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc('join_company_by_invite', {
      _invite_code: inviteCode.trim(),
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    const result = data as { error?: string; success?: boolean; company_name?: string };
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Te uniste a "${result.company_name}"`);
    await refreshMemberships();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
            <MessageSquare className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Un último paso</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Para empezar, decinos a qué empresa pertenecés
          </p>
        </div>

        <div className="glass-panel rounded-xl p-6 space-y-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'create' | 'join')}>
            <TabsList className="w-full">
              <TabsTrigger value="create" className="flex-1 gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Crear empresa
              </TabsTrigger>
              <TabsTrigger value="join" className="flex-1 gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Unirme a una
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="mt-4 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="companyName">Nombre de tu empresa</Label>
                <Input
                  id="companyName"
                  placeholder="Mi Tienda Online"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="bg-muted/50 border-border/50"
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={submitting || !companyName.trim()}
                className="w-full"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Crear empresa
              </Button>
            </TabsContent>

            <TabsContent value="join" className="mt-4 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Código de invitación</Label>
                <Input
                  id="inviteCode"
                  placeholder="abc123def456"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="bg-muted/50 border-border/50 font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  Pedile el código al administrador de la empresa.
                </p>
              </div>
              <Button
                onClick={handleJoin}
                disabled={submitting || !inviteCode.trim()}
                className="w-full"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Unirme a la empresa
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        <button
          type="button"
          onClick={logout}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-4 transition-colors"
        >
          Cancelar y cerrar sesión
        </button>
      </motion.div>
    </div>
  );
};

export default PostGoogleSetup;
