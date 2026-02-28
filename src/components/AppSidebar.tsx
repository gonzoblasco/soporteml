import { Inbox, LayoutDashboard, Settings, LogOut, MessageSquare, Menu, X, AlertTriangle, Sun, Moon, Shield, ChevronsLeft, ChevronsRight, FileText, Package, Users, ShoppingCart, BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { useTheme } from 'next-themes';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

const navItems = [
  { title: 'Home', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Inbox', url: '/inbox', icon: Inbox, badgeKey: 'inbox' as const },
  { title: 'Priority', url: '/priority', icon: AlertTriangle, badgeKey: 'priority' as const },
  { title: 'Plantillas', url: '/templates', icon: FileText },
  { title: 'Settings', url: '/settings', icon: Settings },
];

const crmSubItems = [
  { title: 'Productos', url: '/catalog', icon: Package, enabled: true },
  { title: 'Clientes', url: '#', icon: Users, enabled: false },
  { title: 'Órdenes', url: '#', icon: ShoppingCart, enabled: false },
  { title: 'Conocimiento', url: '#', icon: BookOpen, enabled: false },
];

const SUPER_ADMIN_EMAIL = 'gonzoblasco@icloud.com';

// Context to share collapsed state
export const SidebarContext = createContext({ collapsed: false });
export const useSidebarCollapsed = () => useContext(SidebarContext);

const AppSidebar = () => {
  const { logout, user, profileName } = useAuth();
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    }
    return false;
  });
  const [priorityCount, setPriorityCount] = useState(0);
  const [inboxCount, setInboxCount] = useState(0);
  const [crmOpen, setCrmOpen] = useState(true);

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const fetchCounts = async () => {
      const [priorityRes, inboxRes] = await Promise.all([
        supabase.from('questions').select('*', { count: 'exact', head: true }).eq('requires_human', true).eq('status', 'pending'),
        supabase.from('questions').select('*', { count: 'exact', head: true }).eq('status', 'pending').eq('requires_human', false),
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

  const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    const count = item.badgeKey === 'priority' ? priorityCount : item.badgeKey === 'inbox' ? inboxCount : 0;
    const badge = item.badgeKey && count > 0 ? (
      <span className="min-w-5 h-5 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold px-1.5">
        {count > 99 ? '99+' : count}
      </span>
    ) : null;

    const link = (
      <NavLink
        to={item.url}
        end={item.url === '/dashboard'}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors ${collapsed && !isMobile ? 'justify-center px-2' : ''}`}
        activeClassName="bg-sidebar-accent text-foreground font-medium"
        onClick={() => isMobile && setOpen(false)}
      >
        <item.icon className="w-4 h-4 shrink-0" />
        {(!collapsed || isMobile) && <span className="flex-1">{item.title}</span>}
        {(!collapsed || isMobile) && badge}
        {collapsed && !isMobile && badge && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-semibold px-1">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </NavLink>
    );

    if (collapsed && !isMobile) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">{link}</div>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {item.title}
            {count > 0 && ` (${count})`}
          </TooltipContent>
        </Tooltip>
      );
    }

    return link;
  };

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className={`h-14 flex items-center justify-between border-b border-sidebar-border ${collapsed && !isMobile ? 'px-2' : 'px-5'}`}>
        <div className={`flex items-center gap-2 ${collapsed && !isMobile ? 'justify-center w-full' : ''}`}>
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          {(!collapsed || isMobile) && <span className="font-semibold text-sm text-foreground">SoporteML</span>}
        </div>
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Nav */}
      <TooltipProvider delayDuration={0}>
        <nav className="flex-1 py-3 px-3 space-y-0.5">
          {navItems.map((item) => (
            <NavItem key={item.url} item={item} />
          ))}

          {/* CRM Group */}
          {(!collapsed || isMobile) ? (
            <div className="pt-2">
              <button
                onClick={() => setCrmOpen(!crmOpen)}
                className="flex items-center gap-2 px-3 py-1.5 w-full text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                {crmOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                Catálogo
              </button>
              {crmOpen && (
                <div className="space-y-0.5">
                  {crmSubItems.map((sub) =>
                    sub.enabled ? (
                      <NavLink
                        key={sub.url}
                        to={sub.url}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                        activeClassName="bg-sidebar-accent text-foreground font-medium"
                        onClick={() => isMobile && setOpen(false)}
                      >
                        <sub.icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1">{sub.title}</span>
                      </NavLink>
                    ) : (
                      <div
                        key={sub.title}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground/50 cursor-not-allowed"
                      >
                        <sub.icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1">{sub.title}</span>
                        <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full">Próximamente</span>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <NavLink
                  to="/catalog"
                  className="flex items-center justify-center px-2 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                  activeClassName="bg-sidebar-accent text-foreground font-medium"
                >
                  <Package className="w-4 h-4" />
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">Catálogo</TooltipContent>
            </Tooltip>
          )}
          {user?.email === SUPER_ADMIN_EMAIL && (
            collapsed && !isMobile ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <NavLink
                    to="/admin"
                    className="flex items-center justify-center px-2 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                    activeClassName="bg-sidebar-accent text-foreground font-medium"
                  >
                    <Shield className="w-4 h-4" />
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">Admin</TooltipContent>
              </Tooltip>
            ) : (
              <NavLink
                to="/admin"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                activeClassName="bg-sidebar-accent text-foreground font-medium"
                onClick={() => isMobile && setOpen(false)}
              >
                <Shield className="w-4 h-4" />
                <span>Admin</span>
              </NavLink>
            )
          )}
        </nav>
      </TooltipProvider>

      {/* Collapse Toggle (desktop only) */}
      {!isMobile && (
        <div className="px-3 pb-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={`w-full text-muted-foreground hover:text-foreground ${collapsed ? 'justify-center px-0' : 'justify-start gap-2'}`}
          >
            {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
            {!collapsed && <span className="text-xs">Colapsar</span>}
          </Button>
        </div>
      )}

      {/* Footer */}
      <div className={`p-3 border-t border-sidebar-border space-y-1 ${collapsed && !isMobile ? 'items-center' : ''}`}>
        {collapsed && !isMobile ? (
          <>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-center py-1">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                      {(profileName ?? user?.email ?? '?').charAt(0).toUpperCase()}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">{user?.email}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="h-8 w-8 mx-auto flex"
                  >
                    <Sun className="w-3.5 h-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute w-3.5 h-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">Cambiar tema</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => logout()}
                    className="h-8 w-8 mx-auto flex text-muted-foreground hover:text-destructive"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">Cerrar Sesión</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        ) : (
          <>
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
          </>
        )}
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
    <SidebarContext.Provider value={{ collapsed }}>
      <aside
        className={`${collapsed ? 'w-[52px]' : 'w-60'} h-screen flex flex-col bg-sidebar border-r border-sidebar-border shrink-0 sticky top-0 transition-all duration-200`}
      >
        {sidebarContent}
      </aside>
    </SidebarContext.Provider>
  );
};

export default AppSidebar;
