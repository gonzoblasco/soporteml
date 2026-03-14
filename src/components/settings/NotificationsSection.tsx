import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const NOTIF_KEY = 'soporteml_push_enabled';

const NotificationsSection = () => {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(() => {
    return localStorage.getItem(NOTIF_KEY) !== 'false';
  });
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>(
    'Notification' in window ? Notification.permission : 'unsupported'
  );

  const handleToggle = async (checked: boolean) => {
    if (checked && permissionState === 'default') {
      const result = await Notification.requestPermission();
      setPermissionState(result);
      if (result === 'denied') {
        toast({ title: 'Permiso denegado', description: 'Habilitá las notificaciones desde la configuración de tu navegador.', variant: 'destructive' });
        return;
      }
    }

    if (checked && permissionState === 'denied') {
      toast({ title: 'Permiso bloqueado', description: 'Desbloqueá las notificaciones desde la configuración de tu navegador para este sitio.', variant: 'destructive' });
      return;
    }

    localStorage.setItem(NOTIF_KEY, String(checked));
    setEnabled(checked);
    toast({ title: checked ? 'Notificaciones activadas' : 'Notificaciones desactivadas' });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-sm">Notificaciones</CardTitle>
        </div>
        <CardDescription>Alertas del navegador cuando llegan preguntas nuevas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-toggle" className="text-sm">Notificaciones push</Label>
            <p className="text-xs text-muted-foreground">Recibí alertas incluso cuando la pestaña no está activa.</p>
          </div>
          <Switch
            id="push-toggle"
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={permissionState === 'unsupported'}
          />
        </div>
        {permissionState === 'denied' && (
          <p className="text-xs text-destructive">
            Las notificaciones están bloqueadas por el navegador. Desbloqueálas desde la configuración del sitio.
          </p>
        )}
        {permissionState === 'unsupported' && (
          <p className="text-xs text-muted-foreground">
            Tu navegador no soporta notificaciones push.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationsSection;
