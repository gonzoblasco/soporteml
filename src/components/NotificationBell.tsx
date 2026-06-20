import { useState, useEffect, useCallback, useRef, KeyboardEvent } from 'react';
import { Bell, Check, CheckCheck, ExternalLink, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { timeAgoEs } from '@/lib/timeAgo';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

const typeIcons: Record<string, string> = {
  new_question: '💬',
  priority_question: '🔴',
  token_expiring: '⚠️',
  answer_published: '✅',
};

const typeLabelsEs: Record<string, string> = {
  new_question: 'Pregunta nueva',
  priority_question: 'Pregunta prioritaria',
  token_expiring: 'Conexión por vencer',
  answer_published: 'Respuesta publicada',
};

export const NotificationBell = ({ collapsed, label }: { collapsed?: boolean; label?: string }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // When the popover opens, move focus to the first item (or the markAll button).
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const first = itemRefs.current.find(Boolean);
      first?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [open, notifications.length]);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n: any) => !n.read).length);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('notifications-bell')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleClick = (n: Notification) => {
    if (!n.read) markAsRead(n.id);
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  const handleListKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const items = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
    if (items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = items[(index + 1) % items.length];
      next?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = items[(index - 1 + items.length) % items.length];
      prev?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1]?.focus();
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterType !== 'all' && n.type !== filterType) return false;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      const typeLabel = (typeLabelsEs[n.type] ?? '').toLowerCase();
      const hay =
        n.title.toLowerCase().includes(q) ||
        (n.message ?? '').toLowerCase().includes(q) ||
        typeLabel.includes(q);
      if (!hay) return false;
    }
    return true;
  });
  const isFiltering = filterType !== 'all' || searchText.trim().length > 0;

  const ariaTriggerLabel =
    unreadCount > 0
      ? `Notificaciones, ${unreadCount} sin leer`
      : 'Notificaciones, sin novedades';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {collapsed || !label ? (
          <Button
            variant="ghost"
            size="icon"
            className={`relative h-8 w-8 ${collapsed ? 'mx-auto' : ''}`}
            aria-label={ariaTriggerLabel}
            aria-haspopup="dialog"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -top-0.5 -right-0.5 min-w-4 h-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-semibold px-1"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 px-2 h-8 text-muted-foreground hover:text-foreground"
            aria-label={ariaTriggerLabel}
            aria-haspopup="dialog"
          >
            <span className="relative inline-flex items-center justify-center w-4 h-4 shrink-0">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute -top-1.5 -right-1.5 min-w-4 h-4 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-semibold px-1"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </span>
            <span className="text-xs">{label}</span>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        className="w-80 p-0"
        aria-labelledby="notif-title"
      >
        {/* Live region: announces changes to unread count without stealing focus */}
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {unreadCount > 0
            ? `${unreadCount} ${unreadCount === 1 ? 'notificación sin leer' : 'notificaciones sin leer'}`
            : 'No hay notificaciones sin leer'}
        </span>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h4 className="text-sm font-semibold text-foreground" id="notif-title">
            Notificaciones
          </h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              className="text-xs h-7 gap-1 text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Marcar las ${unreadCount} notificaciones como leídas`}
            >
              <CheckCheck className="w-3 h-3" aria-hidden="true" />
              Marcar todas
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar..."
              aria-label="Buscar notificaciones por texto"
              className="h-8 text-xs pl-7"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger
              className="h-8 text-xs w-[130px]"
              aria-label="Filtrar notificaciones por tipo"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos los tipos</SelectItem>
              {Object.entries(typeLabelsEs).map(([value, label]) => (
                <SelectItem key={value} value={value} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8" role="status">
              Sin notificaciones
            </p>
          ) : filteredNotifications.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8" role="status">
              Ninguna notificación coincide con tu búsqueda.
            </p>
          ) : (
            <ul
              aria-labelledby="notif-title"
              className="divide-y divide-border focus:outline-none"
            >
              {filteredNotifications.map((n, i) => {
                const typeLabel = typeLabelsEs[n.type] ?? 'Notificación';
                const stateLabel = n.read ? 'Leída' : 'No leída';
                const dateIso = new Date(n.created_at).toISOString();
                const ariaLabel = [
                  stateLabel,
                  typeLabel,
                  n.title,
                  n.message ?? '',
                  timeAgoEs(n.created_at),
                  n.link ? 'Abrir' : '',
                ].filter(Boolean).join('. ');
                return (
                  <li key={n.id}>
                    <button
                      ref={(el) => { itemRefs.current[i] = el; }}
                      onClick={() => handleClick(n)}
                      onKeyDown={(e) => handleListKeyDown(e, i)}
                      aria-label={ariaLabel}
                      aria-current={!n.read ? 'true' : undefined}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus:outline-none focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${!n.read ? 'bg-primary/5' : ''}`}
                    >
                      <span aria-hidden="true" className="text-base mt-0.5">{typeIcons[n.type] || '🔔'}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!n.read ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                          {n.title}
                        </p>
                        {n.message && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{n.message}</p>
                        )}
                        <time
                          dateTime={dateIso}
                          className="block text-[10px] text-muted-foreground/70 mt-1"
                        >
                          {timeAgoEs(n.created_at)}
                        </time>
                      </div>
                      {!n.read && (
                        <span aria-hidden="true" className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
