import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, Inbox } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

// Simple notification sound using Web Audio API
const playSound = (type: 'priority' | 'normal') => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'priority') {
      osc.frequency.value = 880;
      gain.gain.value = 0.15;
      osc.start();
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.stop(ctx.currentTime + 0.4);
    } else {
      osc.frequency.value = 523;
      gain.gain.value = 0.08;
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.stop(ctx.currentTime + 0.35);
    }

    if (type === 'priority' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  } catch {
    // Audio not supported
  }
};

// Browser push notification using Notification API
const sendBrowserNotification = (title: string, body: string, tag: string, onClick?: () => void) => {
  // Check user preference from localStorage
  if (localStorage.getItem('soporteml_push_enabled') === 'false') return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  // Only show browser notification when tab is not focused
  if (document.hasFocus()) return;

  try {
    const notification = new Notification(title, {
      body,
      tag, // Prevents duplicate notifications
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      requireInteraction: false,
    });

    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }

    // Auto-close after 8 seconds
    setTimeout(() => notification.close(), 8000);
  } catch {
    // Notification not supported in this context
  }
};

// Request notification permission (non-blocking)
const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
};

const DashboardLayout = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const initialLoad = useRef(true);
  const { currentCompanyId } = useAuth();

  useEffect(() => {
    // Request push notification permission on mount
    requestNotificationPermission();

    const timer = setTimeout(() => { initialLoad.current = false; }, 2000);

    const channel = supabase
      .channel('question-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'questions', filter: 'requires_human=eq.true' },
        (payload) => {
          if (initialLoad.current) return;
          const q = payload.new as any;
          if (currentCompanyId && q.company_id !== currentCompanyId) return;
          const text = q.question_text?.slice(0, 120) || 'Nueva consulta';

          playSound('priority');

          // In-app toast
          toast('🚨 Consulta prioritaria', {
            description: text.slice(0, 80) + (text.length > 80 ? '...' : ''),
            icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
            action: {
              label: 'Ver',
              onClick: () => navigate('/priority'),
            },
            duration: 8000,
          });

          // Browser push notification (shows when tab is not focused)
          sendBrowserNotification(
            '🚨 Consulta prioritaria',
            text,
            `priority-${q.meli_question_id}`,
            () => navigate('/priority')
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'questions', filter: 'requires_human=eq.false' },
        (payload) => {
          if (initialLoad.current) return;
          const q = payload.new as any;
          if (currentCompanyId && q.company_id !== currentCompanyId) return;
          const text = q.question_text?.slice(0, 120) || 'Nueva consulta';

          playSound('normal');

          // In-app toast
          toast('Nueva pregunta en Inbox', {
            description: text.slice(0, 80) + (text.length > 80 ? '...' : ''),
            icon: <Inbox className="w-4 h-4 text-primary" />,
            action: {
              label: 'Ver',
              onClick: () => navigate('/inbox'),
            },
            duration: 5000,
          });

          // Browser push notification (shows when tab is not focused)
          sendBrowserNotification(
            'Nueva pregunta en Inbox',
            text,
            `question-${q.meli_question_id}`,
            () => navigate('/')
          );
        }
      )
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [navigate, currentCompanyId]);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <AppSidebar />
      <main className={`flex-1 overflow-hidden h-full ${isMobile ? 'pt-14' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default DashboardLayout;
