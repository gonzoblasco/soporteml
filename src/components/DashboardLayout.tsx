import { Outlet, useNavigate } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, Inbox } from 'lucide-react';

// Simple notification sound using Web Audio API
const playSound = (type: 'priority' | 'normal') => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'priority') {
      // Urgent: two quick high-pitched beeps
      osc.frequency.value = 880;
      gain.gain.value = 0.15;
      osc.start();
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.stop(ctx.currentTime + 0.4);
    } else {
      // Gentle: single soft chime
      osc.frequency.value = 523;
      gain.gain.value = 0.08;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.stop(ctx.currentTime + 0.35);
    }

    // Try vibration for priority on mobile
    if (type === 'priority' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  } catch {
    // Audio not supported
  }
};

const DashboardLayout = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const initialLoad = useRef(true);

  useEffect(() => {
    // Skip notifications during initial subscription setup
    const timer = setTimeout(() => { initialLoad.current = false; }, 2000);

    const channel = supabase
      .channel('question-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'questions', filter: 'requires_human=eq.true' },
        (payload) => {
          if (initialLoad.current) return;
          const q = payload.new as any;
          playSound('priority');
          toast('🚨 Consulta prioritaria', {
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
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'questions', filter: 'requires_human=eq.false' },
        (payload) => {
          if (initialLoad.current) return;
          const q = payload.new as any;
          playSound('normal');
          toast('Nueva pregunta en Inbox', {
            description: q.question_text?.slice(0, 80) + (q.question_text?.length > 80 ? '...' : ''),
            icon: <Inbox className="w-4 h-4 text-primary" />,
            action: {
              label: 'Ver',
              onClick: () => navigate('/'),
            },
            duration: 5000,
          });
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <AppSidebar />
      <main className={`flex-1 overflow-hidden h-full ${isMobile ? 'pt-14' : ''}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
