import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { lovable } from '@/integrations/lovable';
import { toast } from 'sonner';

interface GoogleSignInButtonProps {
  label?: string;
}

const GoogleSignInButton = ({ label = 'Continuar con Google' }: GoogleSignInButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    // Preserve `?next=` (e.g. the OAuth consent URL) across the Google round-trip
    // by sending Google's redirect back to the same URL that opened the login.
    const currentUrl = window.location.pathname + window.location.search;
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');
    const redirectUri = next && next.startsWith('/') && !next.startsWith('//')
      ? window.location.origin + currentUrl
      : window.location.origin;
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: redirectUri,
    });

    if (result.error) {
      toast.error('No pudimos iniciar sesión con Google. Intentá de nuevo.');
      setLoading(false);
      return;
    }

    if (result.redirected) {
      // Browser redirects to Google
      return;
    }

    // Tokens recibidos. AuthContext detectará el cambio de sesión vía onAuthStateChange.
    // Si el user no tiene empresa, ProtectedRoute lo manda a /post-google.
    setLoading(false);
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={loading}
      className="w-full gap-2 bg-background hover:bg-muted/50"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
      )}
      {label}
    </Button>
  );
};

export default GoogleSignInButton;
