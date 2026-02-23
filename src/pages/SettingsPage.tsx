import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SettingsPage = () => (
  <div className="p-6 h-screen overflow-y-auto">
    <h1 className="text-xl font-semibold text-foreground mb-2">Settings</h1>
    <p className="text-sm text-muted-foreground mb-6">Configuración de la cuenta y preferencias</p>
    <Card className="glass-panel max-w-2xl">
      <CardHeader>
        <CardTitle className="text-sm">Cuenta</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Las configuraciones avanzadas estarán disponibles próximamente.
        </p>
      </CardContent>
    </Card>
  </div>
);

export default SettingsPage;
