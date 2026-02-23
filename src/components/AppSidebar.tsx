import { Inbox, BarChart3, Settings, LogOut, MessageSquare, Menu, X } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

const navItems = [
  { title: 'Inbox', url: '/', icon: Inbox },
  { title: 'Analytics', url: '/analytics', icon: BarChart3 },
  { title: 'Settings', url: '/settings', icon: Settings },
];

const AppSidebar = () => {
  const { logout, user, profileName } = useAuth();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

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
            end={item.url === '/'}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            activeClassName="bg-sidebar-accent text-foreground font-medium"
            onClick={() => isMobile && setOpen(false)}
          >
            <item.icon className="w-4 h-4" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2 px-3 py-1 mb-2">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
            {(profileName ?? user?.email ?? '?').charAt(0).toUpperCase()}
          </div>
          <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
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
    <aside className="w-60 h-screen flex flex-col bg-sidebar border-r border-sidebar-border shrink-0">
      {sidebarContent}
    </aside>
  );
};

export default AppSidebar;
