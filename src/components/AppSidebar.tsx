import { Inbox, BarChart3, Settings, LogOut, MessageSquare, Menu, X, AlertTriangle, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';

const navItems = [
  { title: 'Inbox', url: '/dashboard', icon: Inbox, badgeKey: 'inbox' as const },
  { title: 'Priority', url: '/priority', icon: AlertTriangle, badgeKey: 'priority' as const },
  { title: 'Analytics', url: '/analytics', icon: BarChart3 },
  { title: 'Settings', url: '/settings', icon: Settings },
];

const AppSidebar = () => {
  const { logout, user, profileName } = useAuth();
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [priorityCount, setPriorityCount] = useState(0);
  const [inboxCount, setInboxCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      const [priorityRes, inboxRes] = await Promise.all([
        supabase.from('questions').select('*', { count: 'exact', head: true }).eq('requires_human', true).eq('status', 'pending'),
        supabase.from('questions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      setPriorityCount(priorityRes.count ?? 0);
      setInboxCount(inboxRes.count ?? 0);
    };
    fetchCounts();

    const channel = supabase
      .channel('priority-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, () => {
        fetchCounts();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="h-14 flex items-center justify-between px-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-sm text-foreground">SoporteML</span>
        </div>
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === '/dashboard'}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            activeClassName="bg-sidebar-accent text-foreground font-medium"
            onClick={() => isMobile && setOpen(false)}
          >
            <item.icon className="w-4 h-4" />
            <span className="flex-1">{item.title}</span>
            {item.badgeKey && (() => {
              const count = item.badgeKey === 'priority' ? priorityCount : inboxCount;
              return count > 0 ? (
                <span className="min-w-5 h-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold px-1.5">
                  {count > 99 ? '99+' : count}
                </span>
              ) : null;
            })()}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <div className="flex items-center gap-2 px-3 py-1">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
            {(profileName ?? user?.email ?? '?').charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-muted-foreground truncate flex-1">{user?.email}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-7 w-7 rounded-full shrink-0"
          >
            <Sun className="w-3.5 h-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute w-3.5 h-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Cambiar tema</span>
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => logout()}
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        {/* Mobile header bar */}
        <div className="fixed top-0 left-0 right-0 z-40 h-14 flex items-center px-4 bg-sidebar border-b border-sidebar-border">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)} className="h-8 w-8 mr-2">
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-semibold text-sm text-foreground">SoporteML</span>
          </div>
        </div>

        {/* Overlay */}
        {open && (
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setOpen(false)}>
            <aside
              className="w-60 h-full flex flex-col bg-sidebar"
              onClick={(e) => e.stopPropagation()}
            >
              {sidebarContent}
            </aside>
          </div>
        )}
      </>
    );
  }

  return (
    <aside className="w-60 h-screen flex flex-col bg-sidebar border-r border-sidebar-border shrink-0 sticky top-0">
      {sidebarContent}
    </aside>
  );
};

export default AppSidebar;
