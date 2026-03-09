import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { Trash2, Plus, Loader2, Mail, Building2, Users, Shield, UserCircle, Search, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import MetricsTab from '@/components/admin/MetricsTab';
import CompaniesTab from '@/components/admin/CompaniesTab';

const SearchInput = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
    <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="pl-9" />
  </div>
);

const useSearch = <T,>(items: T[], keys: (keyof T)[]) => {
  const [query, setQuery] = useState('');
  const filtered = query.trim()
    ? items.filter(item =>
        keys.some(k => {
          const val = item[k];
          return typeof val === 'string' && val.toLowerCase().includes(query.toLowerCase());
        })
      )
    : items;
  return { query, setQuery, filtered };
};

interface Inquiry {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
}

const AdminPanel = () => {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) { setChecking(false); return; }
    supabase.rpc('is_super_admin').then(({ data }) => {
      setIsSuperAdmin(data === true);
      setChecking(false);
    });
  }, [user]);

  if (checking) return <div className="flex justify-center items-center h-screen"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Panel de Administración</h1>
      </div>

      <Tabs defaultValue="metrics">
        <TabsList className="mb-4">
          <TabsTrigger value="metrics" className="gap-2"><BarChart3 className="w-4 h-4" />Métricas</TabsTrigger>
          <TabsTrigger value="inquiries" className="gap-2"><Mail className="w-4 h-4" />Consultas</TabsTrigger>
          <TabsTrigger value="companies" className="gap-2"><Building2 className="w-4 h-4" />Companies</TabsTrigger>
          <TabsTrigger value="users" className="gap-2"><UserCircle className="w-4 h-4" />Usuarios</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics"><MetricsTab /></TabsContent>
        <TabsContent value="inquiries"><InquiriesTab /></TabsContent>
        <TabsContent value="companies"><CompaniesTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
      </Tabs>
    </div>
  );
};

/* ─── Inquiries Tab ─── */
const InquiriesTab = () => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInquiries = async () => {
    const { data } = await supabase
      .from('contact_inquiries')
      .select('*')
      .order('created_at', { ascending: false });
    setInquiries(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchInquiries(); }, []);

  const { query, setQuery, filtered } = useSearch(inquiries, ['name', 'email', 'message']);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('contact_inquiries').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setInquiries(prev => prev.filter(i => i.id !== id));
      toast({ title: 'Consulta eliminada' });
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  if (inquiries.length === 0) return <p className="text-muted-foreground text-sm py-8 text-center">No hay consultas recibidas aún.</p>;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Consultas del Landing</CardTitle>
            <CardDescription>{filtered.length} de {inquiries.length} consulta{inquiries.length !== 1 ? 's' : ''}</CardDescription>
          </div>
          <SearchInput value={query} onChange={setQuery} placeholder="Buscar por nombre, email..." />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden md:table-cell">Mensaje</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(inq => (
              <TableRow key={inq.id}>
                <TableCell className="font-medium">{inq.name}</TableCell>
                <TableCell className="text-muted-foreground">{inq.email}</TableCell>
                <TableCell className="hidden md:table-cell max-w-xs truncate text-muted-foreground">{inq.message}</TableCell>
                <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                  {new Date(inq.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(inq.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sin resultados para "{query}"</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

/* ─── Users Tab (Hito 5: memberships-based) ─── */
interface AdminUser {
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

interface UserMembership {
  user_id: string;
  company_id: string;
  company_name: string;
  role: 'admin' | 'agent';
}

const MembershipChip = ({
  membership,
  isUpdating,
  onRoleChange,
  onRemove,
}: {
  membership: UserMembership;
  isUpdating: boolean;
  onRoleChange: (role: 'admin' | 'agent') => void;
  onRemove: () => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button
        disabled={isUpdating}
        className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-colors hover:bg-accent cursor-pointer ${
          membership.role === 'admin'
            ? 'border-primary/30 bg-primary/5 text-primary'
            : 'border-border bg-muted text-muted-foreground'
        }`}
      >
        {isUpdating && <Loader2 className="w-3 h-3 animate-spin" />}
        <span className="font-medium">{membership.company_name}</span>
        <span className="opacity-60">· {membership.role === 'admin' ? 'Admin' : 'Agente'}</span>
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{membership.company_name}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => onRoleChange('admin')} disabled={membership.role === 'admin'}>
        Hacer Admin
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onRoleChange('agent')} disabled={membership.role === 'agent'}>
        Hacer Agente
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={onRemove} className="text-destructive focus:text-destructive">
        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
        Quitar de empresa
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

const AddMembershipPopover = ({
  userId,
  availableCompanies,
  isUpdating,
  onAdd,
}: {
  userId: string;
  availableCompanies: { id: string; name: string }[];
  isUpdating: boolean;
  onAdd: (userId: string, companyId: string, role: 'admin' | 'agent') => Promise<void>;
}) => {
  const [open, setOpen] = useState(false);
  const [addCompany, setAddCompany] = useState('');
  const [addRole, setAddRole] = useState<'admin' | 'agent'>('agent');

  const handleAdd = async () => {
    if (!addCompany) return;
    await onAdd(userId, addCompany, addRole);
    setAddCompany('');
    setAddRole('agent');
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          disabled={availableCompanies.length === 0}
          title={availableCompanies.length === 0 ? 'Ya pertenece a todas las empresas' : 'Agregar a empresa'}
        >
          <Plus className="w-3 h-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 space-y-3">
        <p className="text-sm font-medium">Agregar a empresa</p>
        <Select value={addCompany} onValueChange={setAddCompany}>
          <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
          <SelectContent>
            {availableCompanies.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={addRole} onValueChange={(v) => setAddRole(v as 'admin' | 'agent')}>
          <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="agent">Agente</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" className="w-full text-xs" onClick={handleAdd} disabled={!addCompany || isUpdating}>
          {isUpdating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
          Agregar
        </Button>
      </PopoverContent>
    </Popover>
  );
};

const UsersTab = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [membershipsByUser, setMembershipsByUser] = useState<Map<string, UserMembership[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchData = async () => {
    const [usersRes, companiesRes, membershipsRes] = await Promise.all([
      supabase.rpc('get_admin_users'),
      supabase.from('companies').select('id, name').order('name'),
      supabase.from('memberships').select('user_id, company_id, role').eq('status', 'active'),
    ]);

    const companiesData = companiesRes.data ?? [];
    setCompanies(companiesData);

    const companyMap = new Map(companiesData.map((c: any) => [c.id, c.name]));
    const memMap = new Map<string, UserMembership[]>();
    ((membershipsRes.data ?? []) as any[]).forEach((m: any) => {
      const list = memMap.get(m.user_id) ?? [];
      list.push({
        user_id: m.user_id,
        company_id: m.company_id,
        company_name: (companyMap.get(m.company_id) as string) ?? '?',
        role: m.role,
      });
      memMap.set(m.user_id, list);
    });
    setMembershipsByUser(memMap);

    setUsers(((usersRes.data ?? []) as any[]).map((u: any) => ({
      user_id: u.user_id,
      email: u.email,
      full_name: u.full_name,
      created_at: u.created_at,
    })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleRoleChange = async (userId: string, companyId: string, newRole: 'admin' | 'agent') => {
    const key = `${userId}-${companyId}`;
    setUpdating(key);
    const { error } = await supabase.rpc('update_membership_role' as any, {
      _user_id: userId, _company_id: companyId, _new_role: newRole,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setMembershipsByUser(prev => {
        const next = new Map(prev);
        const mems = next.get(userId) ?? [];
        next.set(userId, mems.map(m => m.company_id === companyId ? { ...m, role: newRole } : m));
        return next;
      });
      toast({ title: 'Rol actualizado' });
    }
    setUpdating(null);
  };

  const handleRemoveMembership = async (userId: string, companyId: string) => {
    const key = `${userId}-${companyId}`;
    setUpdating(key);
    const { error } = await supabase.rpc('remove_company_membership' as any, {
      _user_id: userId, _company_id: companyId,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setMembershipsByUser(prev => {
        const next = new Map(prev);
        next.set(userId, (next.get(userId) ?? []).filter(m => m.company_id !== companyId));
        return next;
      });
      toast({ title: 'Membresía eliminada' });
    }
    setUpdating(null);
  };

  const handleAddMembership = async (userId: string, companyId: string, role: 'admin' | 'agent') => {
    const key = `${userId}-add`;
    setUpdating(key);
    const { error } = await supabase.rpc('add_company_membership' as any, {
      _user_id: userId, _company_id: companyId, _role: role,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      const companyName = companies.find(c => c.id === companyId)?.name ?? '?';
      setMembershipsByUser(prev => {
        const next = new Map(prev);
        const mems = next.get(userId) ?? [];
        if (!mems.some(m => m.company_id === companyId)) {
          next.set(userId, [...mems, { user_id: userId, company_id: companyId, company_name: companyName, role }]);
        }
        return next;
      });
      toast({ title: 'Membresía agregada' });
    }
    setUpdating(null);
  };

  const { query: userQuery, setQuery: setUserQuery, filtered: filteredUsers } = useSearch(users, ['email', 'full_name'] as (keyof AdminUser)[]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Usuarios registrados</CardTitle>
            <CardDescription>{filteredUsers.length} de {users.length} usuario{users.length !== 1 ? 's' : ''}</CardDescription>
          </div>
          {users.length > 0 && <SearchInput value={userQuery} onChange={setUserQuery} placeholder="Buscar por nombre o email..." />}
        </div>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No hay usuarios registrados aún.</p>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map(u => {
              const memberships = membershipsByUser.get(u.user_id) ?? [];
              const availableCompanies = companies.filter(c => !memberships.some(m => m.company_id === c.id));
              const isMulti = memberships.length > 1;

              return (
                <div key={u.user_id} className="border border-border rounded-lg p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {u.full_name ?? '—'}
                        {isMulti && (
                          <Badge variant="outline" className="ml-2 text-[10px] border-primary/30 text-primary">Multi-company</Badge>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground/50 whitespace-nowrap shrink-0">
                      {new Date(u.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {memberships.length === 0 && (
                      <span className="text-[11px] text-muted-foreground/50">Sin empresas</span>
                    )}
                    {memberships.map(m => (
                      <MembershipChip
                        key={m.company_id}
                        membership={m}
                        isUpdating={updating === `${u.user_id}-${m.company_id}`}
                        onRoleChange={(role) => handleRoleChange(u.user_id, m.company_id, role)}
                        onRemove={() => handleRemoveMembership(u.user_id, m.company_id)}
                      />
                    ))}
                    <AddMembershipPopover
                      userId={u.user_id}
                      availableCompanies={availableCompanies}
                      isUpdating={updating === `${u.user_id}-add`}
                      onAdd={handleAddMembership}
                    />
                  </div>
                </div>
              );
            })}
            {filteredUsers.length === 0 && (
              <p className="text-center text-muted-foreground py-6">Sin resultados para "{userQuery}"</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminPanel;
