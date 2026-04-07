import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase-init';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Link2, Inbox, Sparkles, ArrowRight, Loader2 } from 'lucide-react';

const MELI_APP_ID = import.meta.env.VITE_MELI_APP_ID || '8921097700859218';

interface OnboardingWizardProps {
  onComplete: () => void;
}

const OnboardingWizard = ({ onComplete }: OnboardingWizardProps) => {
  const { user, profileName, currentCompanyId } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [meliConnected, setMeliConnected] = useState(false);
  const [checkingMeli, setCheckingMeli] = useState(true);

  const checkMeliConnection = useCallback(async () => {
    if (!currentCompanyId) { setCheckingMeli(false); return; }
    const { data } = await supabase.rpc('get_meli_connection_status', { _company_id: currentCompanyId });
    const rows = data as any[] | null;
    setMeliConnected(!!data);
    setCheckingMeli(false);
  }, [currentCompanyId]);

  useEffect(() => { checkMeliConnection(); }, [checkMeliConnection]);

  const handleConnectMeli = async () => {
    if (!currentCompanyId) return;

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
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`;
    const redirectUri = `${supabaseUrl}/functions/v1/meli-oauth-callback`;
    const authUrl = `https://auth.mercadolibre.com.ar/authorization?response_type=code&client_id=${MELI_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(statePayload)}&scope=offline_access%20read%20write&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    const popup = window.open(authUrl, 'meli_oauth', 'width=600,height=700');
    const interval = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(interval);
        checkMeliConnection();
      }
    }, 1000);
  };

  const handleFinish = () => {
    localStorage.setItem('onboarding_complete', 'true');
    onComplete();
  };

  const steps = [
    {
      icon: Sparkles,
      title: `¡Bienvenido${profileName ? `, ${profileName.split(' ')[0]}` : ''}!`,
      description: 'SoporteML va a ayudarte a responder las preguntas de Mercado Libre más rápido usando IA. En 2 pasos vas a tener todo listo.',
      action: (
        <Button onClick={() => setStep(1)} className="gap-2">
          Empezar <ArrowRight className="w-4 h-4" />
        </Button>
      ),
    },
    {
      icon: Link2,
      title: 'Conectá Mercado Libre',
      description: 'Vinculá tu cuenta de vendedor para que las preguntas lleguen automáticamente a tu bandeja.',
      action: checkingMeli ? (
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      ) : meliConnected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
            <span>¡Cuenta conectada exitosamente!</span>
          </div>
          <Button onClick={() => setStep(2)} className="gap-2">
            Continuar <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Button onClick={handleConnectMeli} className="gap-2">
            <Link2 className="w-4 h-4" />
            Conectar MercadoLibre
          </Button>
          <button
            onClick={() => setStep(2)}
            className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Omitir por ahora →
          </button>
        </div>
      ),
    },
    {
      icon: Inbox,
      title: '¡Todo listo!',
      description: meliConnected
        ? 'Tu cuenta está conectada. Las preguntas se sincronizarán automáticamente. Podés personalizar la IA y las plantillas desde Configuración.'
        : 'Podés conectar MercadoLibre en cualquier momento desde Configuración. Mientras tanto, explorá el panel.',
      action: (
        <Button onClick={handleFinish} className="gap-2">
          Ir al panel <ArrowRight className="w-4 h-4" />
        </Button>
      ),
    },
  ];

  const current = steps[step];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= step ? 'bg-primary w-8' : 'bg-muted w-4'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="glass-panel rounded-xl p-8 text-center"
          >
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-6">
              <current.icon className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">{current.title}</h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{current.description}</p>
            {current.action}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default OnboardingWizard;
