import { Outlet, useNavigate } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

const DashboardLayout = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  useEffect(() => {
    const channel = supabase
      .channel('priority-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'questions', filter: 'requires_human=eq.true' },
        (payload) => {
          const q = payload.new as any;
          toast('Nueva consulta prioritaria', {
            description: q.question_text?.slice(0, 80) + (q.question_text?.length > 80 ? '...' : ''),
            icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
            action: {
              label: 'Ver',
              onClick: () => navigate('/priority'),
            },
            duration: 8000,
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [navigate]);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className={`flex-1 overflow-hidden ${isMobile ? 'pt-14' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
