import { useState } from 'react';
import { supabase } from '@/lib/supabase-init';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus } from 'lucide-react';

interface CreateUserDialogProps {
  companies: { id: string; name: string }[];
  onCreated: () => void;
}

const CreateUserDialog = ({ companies, onCreated }: CreateUserDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    company_id: '',
    role: 'agent' as 'admin' | 'agent',
    plan: '' as '' | 'base',
  });

  const resetForm = () => setForm({ full_name: '', email: '', password: '', company_id: '', role: 'agent', plan: '' });

  const handleSubmit = async () => {
    if (!form.full_name || !form.email || !form.password) {
      toast({ title: 'Campos requeridos', description: 'Completá nombre, email y contraseña.', variant: 'destructive' });
      return;
    }
    if (form.password.length < 6) {
      toast({ title: 'Contraseña muy corta', description: 'Mínimo 6 caracteres.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const body: Record<string, string> = {
      email: form.email,
      password: form.password,
      full_name: form.full_name,
    };
    if (form.company_id) {
      body.company_id = form.company_id;
      body.role = form.role;
    }
    if (form.plan) body.plan = form.plan;

    const { data, error } = await supabase.functions.invoke('admin-create-user', { body });

    if (error || data?.error) {
      toast({ title: 'Error al crear usuario', description: data?.error || error?.message, variant: 'destructive' });
    } else {
      toast({ title: 'Usuario creado', description: `${form.full_name} (${form.email})` });
      resetForm();
      setOpen(false);
      onCreated();
    }
    setLoading(false);
  };

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          Crear usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear usuario</DialogTitle>
          <DialogDescription>El usuario podrá acceder de inmediato con las credenciales proporcionadas.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cu-name">Nombre completo *</Label>
            <Input id="cu-name" value={form.full_name} onChange={e => update('full_name', e.target.value)} placeholder="Juan Pérez" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cu-email">Email *</Label>
            <Input id="cu-email" type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="juan@empresa.com" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cu-pass">Contraseña *</Label>
            <Input id="cu-pass" type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>

          <div className="space-y-1.5">
            <Label>Empresa (opcional)</Label>
            <Select value={form.company_id} onValueChange={v => update('company_id', v)}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Sin empresa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin empresa</SelectItem>
                {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {form.company_id && form.company_id !== 'none' && (
            <div className="space-y-1.5">
              <Label>Rol en la empresa</Label>
              <Select value={form.role} onValueChange={v => update('role', v)}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="agent">Agente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Plan de suscripción</Label>
            <Select value={form.plan} onValueChange={v => update('plan', v)}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Sin plan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin plan</SelectItem>
                <SelectItem value="base">Plan Base — $100/mes</SelectItem>
                <SelectItem value="pro" disabled>
                  <span className="flex items-center gap-2">
                    Plan Pro — $200/mes
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">Próximamente</Badge>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Crear usuario
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserDialog;
