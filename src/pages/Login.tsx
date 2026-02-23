import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

const Login = () => {
  const { login, signup, isLoading } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [signupTab, setSignupTab] = useState<string>('create');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    if (isSignup) {
      const opts = signupTab === 'create'
        ? { companyName }
        : { inviteCode };
      const err = await signup(email, password, fullName, opts);
      if (err) {
        toast.error(err);
      } else {
        toast.success('Revisá tu correo para confirmar la cuenta');
      }
    } else {
      const err = await login(email, password);
      if (err) toast.error(err);
    }
    setSubmitting(false);
  };

  const isFormValid = () => {
    if (!email || !password) return false;
    if (isSignup) {
      if (!fullName) return false;
      if (signupTab === 'create' && !companyName.trim()) return false;
      if (signupTab === 'join' && !inviteCode.trim()) return false;
    }
    return true;
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
          <h1 className="text-2xl font-bold text-foreground">SoporteML</h1>
          <p className="text-sm text-muted-foreground mt-1">Panel de soporte para Mercado Libre</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-panel rounded-xl p-6 space-y-4">
          {isSignup && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input
                id="fullName"
                placeholder="Tu nombre"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="bg-muted/50 border-border/50"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-muted/50 border-border/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-muted/50 border-border/50"
            />
          </div>

          {isSignup && (
            <Tabs value={signupTab} onValueChange={setSignupTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create">Crear empresa</TabsTrigger>
                <TabsTrigger value="join">Unirme a una</TabsTrigger>
              </TabsList>
              <TabsContent value="create" className="space-y-2 mt-3">
                <Label htmlFor="companyName">Nombre de la empresa</Label>
                <Input
                  id="companyName"
                  placeholder="Mi Tienda S.A."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="bg-muted/50 border-border/50"
                />
              </TabsContent>
              <TabsContent value="join" className="space-y-2 mt-3">
                <Label htmlFor="inviteCode">Código de invitación</Label>
                <Input
                  id="inviteCode"
                  placeholder="abc123def456"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="bg-muted/50 border-border/50 font-mono"
                />
                <p className="text-xs text-muted-foreground">Pedile el código al administrador de la empresa.</p>
              </TabsContent>
            </Tabs>
          )}

          <Button type="submit" className="w-full" disabled={submitting || isLoading || !isFormValid()}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {isSignup ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          {isSignup ? '¿Ya tenés cuenta?' : '¿No tenés cuenta?'}{' '}
          <button
            type="button"
            onClick={() => setIsSignup(!isSignup)}
            className="text-primary hover:underline font-medium"
          >
            {isSignup ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
