import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle2, ExternalLink, Loader2, RefreshCw, Info, CreditCard, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PLANS = {
  base: {
    name: 'Plan Base',
    price_id: 'price_1T7faRHxJMYe1KhU6WFMGZBE',
    product_id: 'prod_U5rJedcU19HeK3',
    price: 100,
    features: ['Copiloto IA', 'CRM de productos', 'Conexión MercadoLibre', 'Hasta 3 usuarios'],
  },
  pro: {
    name: 'Plan Pro',
    price_id: null,
    product_id: null,
    price: 200,
    features: ['Todo del Plan Base', 'Respuestas automáticas', 'Usuarios ilimitados', 'SLA y reportes'],
  },
};

const BillingSection = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [subscription, setSubscription] = useState<{ subscribed: boolean; product_id?: string; subscription_end?: string } | null>(null);

  const isSuperAdmin = user?.email === 'gonzoblasco@icloud.com';

  const checkSubscription = useCallback(async () => {
    if (isSuperAdmin) {
      setSubscription({ subscribed: true, product_id: '__super_admin__' });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      setSubscription(data);
    } catch {
      setSubscription({ subscribed: false });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkSubscription();
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      setTimeout(checkSubscription, 2000);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [checkSubscription]);

  useEffect(() => {
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  const handleCheckout = async () => {
    setCheckingOut(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'No se pudo iniciar el checkout.', variant: 'destructive' });
    }
    setCheckingOut(false);
  };

  const handleManage = async () => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'No se pudo abrir el portal.', variant: 'destructive' });
    }
    setOpeningPortal(false);
  };

  const isSubscribed = subscription?.subscribed;
  const currentPlan = isSuperAdmin ? 'super_admin' : (isSubscribed && subscription?.product_id === PLANS.base.product_id ? 'base' : null);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-sm">Plan y facturación</CardTitle>
        </div>
        <CardDescription>Gestioná tu suscripción</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />Verificando suscripción...
          </div>
        ) : (
          <>
            {isSubscribed ? (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                <Crown className="w-4 h-4 text-emerald-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {currentPlan === 'super_admin' ? '⚡ Super Admin — Acceso total' : currentPlan === 'base' ? 'Plan Base' : 'Suscripción activa'}
                  </p>
                  {subscription?.subscription_end && (
                    <p className="text-xs text-muted-foreground">
                      Próxima renovación: {new Date(subscription.subscription_end).toLocaleDateString('es-AR')}
                    </p>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={handleManage} disabled={openingPortal}>
                  {openingPortal ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <ExternalLink className="w-3 h-3 mr-1" />}
                  Gestionar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/30">
                <Info className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground flex-1">No tenés una suscripción activa.</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={`rounded-lg border p-4 space-y-3 ${currentPlan === 'base' ? 'border-primary ring-1 ring-primary/20' : 'border-border'}`}>
                {currentPlan === 'base' && (
                  <Badge variant="default" className="text-xs">Tu plan actual</Badge>
                )}
                <div>
                  <p className="font-semibold text-foreground">{PLANS.base.name}</p>
                  <p className="text-2xl font-bold text-foreground">${PLANS.base.price}<span className="text-sm font-normal text-muted-foreground">/mes</span></p>
                </div>
                <ul className="space-y-1">
                  {PLANS.base.features.map(f => (
                    <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                {!isSubscribed && (
                  <Button size="sm" className="w-full" onClick={handleCheckout} disabled={checkingOut}>
                    {checkingOut ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                    Suscribirme
                  </Button>
                )}
              </div>

              <div className="rounded-lg border border-border p-4 space-y-3 opacity-60">
                <Badge variant="secondary" className="text-xs">Próximamente</Badge>
                <div>
                  <p className="font-semibold text-foreground">{PLANS.pro.name}</p>
                  <p className="text-2xl font-bold text-foreground">${PLANS.pro.price}<span className="text-sm font-normal text-muted-foreground">/mes</span></p>
                </div>
                <ul className="space-y-1">
                  {PLANS.pro.features.map(f => (
                    <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-muted-foreground/50 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Button size="sm" variant="ghost" onClick={checkSubscription} className="text-xs">
              <RefreshCw className="w-3 h-3 mr-1" />Verificar estado
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BillingSection;
