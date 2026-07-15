import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { Loader2, MessageSquare, ArrowLeft, Building2, Users } from 'lucide-react';
import { toast } from 'sonner';
import GoogleSignInButton from '@/components/GoogleSignInButton';

const Login = () => {
  const { login, signup, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const codeFromUrl = searchParams.get('code');
  const nextFromUrl = searchParams.get('next');
  const isSignupRoute = window.location.pathname === '/signup';

  const [mode, setMode] = useState<'login' | 'signup'>(isSignupRoute ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [inviteCode, setInviteCode] = useState(codeFromUrl ?? '');
  const [signupTab, setSignupTab] = useState<string>(codeFromUrl ? 'join' : 'create');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    if (mode === 'signup') {
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
      if (err) {
        toast.error(err);
      } else if (nextFromUrl && nextFromUrl.startsWith('/') && !nextFromUrl.startsWith('//')) {
        window.location.href = nextFromUrl;
      }
    }
    setSubmitting(false);
  };

  const isFormValid = () => {
    if (!email || !password) return false;
    if (mode === 'signup') {
      if (!fullName) return false;
      if (signupTab === 'create' && !companyName.trim()) return false;
      if (signupTab === 'join' && !inviteCode.trim()) return false;
    }
    return true;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Helmet>
        <title>{mode === 'signup' ? 'Crear cuenta — SoporteML' : 'Iniciar sesión — SoporteML'}</title>
        <meta name="description" content={mode === 'signup' ? 'Creá tu cuenta gratis en SoporteML y empezá a responder preguntas de Mercado Libre con IA.' : 'Iniciá sesión en SoporteML para gestionar tus preguntas de Mercado Libre.'} />
        <link rel="canonical" href={mode === 'signup' ? 'https://soporteml.com/signup' : 'https://soporteml.com/login'} />
        <meta property="og:title" content={mode === 'signup' ? 'Crear cuenta — SoporteML' : 'Iniciar sesión — SoporteML'} />
        <meta property="og:description" content={mode === 'signup' ? 'Creá tu cuenta gratis en SoporteML.' : 'Iniciá sesión en SoporteML.'} />
        <meta property="og:url" content={mode === 'signup' ? 'https://soporteml.com/signup' : 'https://soporteml.com/login'} />
      </Helmet>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4 hover:bg-primary/20 transition-colors">
            <MessageSquare className="w-6 h-6 text-primary" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground">SoporteML</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === 'login' ? 'Iniciá sesión en tu cuenta' : 'Creá tu cuenta gratis'}
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex rounded-lg bg-muted/50 p-1 mb-6">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 text-sm py-2 rounded-md font-medium transition-all ${mode === 'login' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 text-sm py-2 rounded-md font-medium transition-all ${mode === 'signup' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Registrarse
          </button>
        </div>

        <div className="glass-panel rounded-xl p-6 space-y-4">
          <GoogleSignInButton
            label={mode === 'login' ? 'Iniciar sesión con Google' : 'Registrarse con Google'}
          />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-background/80 px-2 text-muted-foreground">o con email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre completo</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Juan Pérez"
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

          {mode === 'signup' && (
            <>
              <div className="pt-2">
                <Tabs value={signupTab} onValueChange={setSignupTab}>
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
                  <TabsContent value="create" className="mt-3">
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
                  </TabsContent>
                  <TabsContent value="join" className="mt-3">
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
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}

          <Button type="submit" className="w-full" disabled={submitting || isLoading || !isFormValid()}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          {mode === 'login' ? (
            <>¿No tenés cuenta? <button type="button" onClick={() => setMode('signup')} className="text-primary hover:underline font-medium">Registrate gratis</button></>
          ) : (
            <>¿Ya tenés cuenta? <button type="button" onClick={() => setMode('login')} className="text-primary hover:underline font-medium">Iniciá sesión</button></>
          )}
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
