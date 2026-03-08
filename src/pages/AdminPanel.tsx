import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Trash2, Plus, Copy, Loader2, Mail, Building2, Users, Shield, UserCircle, Search, BarChart3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import MetricsTab from '@/components/admin/MetricsTab';
import CompaniesTab from '@/components/admin/CompaniesTab';

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

const SearchInput = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
    <Input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="pl-9"
    />
  </div>
);

interface Inquiry {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
}

interface CompanyRow {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
  member_count: number;
  has_meli: boolean;
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

/* CompaniesTab moved to src/components/admin/CompaniesTab.tsx */

/* ─── Users Tab ─── */
interface AdminUser {
  user_id: string;
  email: string;
  full_name: string | null;
  company_id: string | null;
  company_name: string | null;
  role: string | null;
  created_at: string;
}

const UsersTab = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [updatingCompany, setUpdatingCompany] = useState<string | null>(null);

  const fetchData = async () => {
    const [usersRes, companiesRes] = await Promise.all([
      supabase.rpc('get_admin_users'),
      supabase.from('companies').select('id, name').order('name'),
    ]);
    if (usersRes.error) {
      console.error('Error fetching users:', usersRes.error);
      toast({ title: 'Error', description: usersRes.error.message, variant: 'destructive' });
    }
    setUsers((usersRes.data as AdminUser[]) ?? []);
    setCompanies(companiesRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingRole(userId);
    if (newRole === 'none') {
      const { error } = await supabase.from('user_roles').delete().eq('user_id', userId);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: null } : u));
        toast({ title: 'Rol removido' });
      }
    } else {
      const currentUser = users.find(u => u.user_id === userId);
      if (currentUser?.role) {
        const { error } = await supabase.from('user_roles').update({ role: newRole as 'admin' | 'agent' }).eq('user_id', userId);
        if (error) {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } else {
          setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
          toast({ title: 'Rol actualizado' });
        }
      } else {
        const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: newRole as 'admin' | 'agent' });
        if (error) {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } else {
          setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u));
          toast({ title: 'Rol asignado' });
        }
      }
    }
    setUpdatingRole(null);
  };

  const handleCompanyChange = async (userId: string, companyId: string) => {
    setUpdatingCompany(userId);
    const newCompanyId = companyId === 'none' ? null : companyId;
    const { error } = await supabase.from('profiles').update({ company_id: newCompanyId }).eq('id', userId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      const companyName = companies.find(c => c.id === companyId)?.name ?? null;
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, company_id: newCompanyId, company_name: newCompanyId ? companyName : null } : u));
      toast({ title: newCompanyId ? 'Company asignada' : 'Company removida' });
    }
    setUpdatingCompany(null);
  };

  const { query: userQuery, setQuery: setUserQuery, filtered: filteredUsers } = useSearch(users, ['email', 'full_name', 'company_name', 'role'] as (keyof AdminUser)[]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Usuarios registrados</CardTitle>
            <CardDescription>{filteredUsers.length} de {users.length} usuario{users.length !== 1 ? 's' : ''}</CardDescription>
          </div>
          {users.length > 0 && <SearchInput value={userQuery} onChange={setUserQuery} placeholder="Buscar por nombre, email, company..." />}
        </div>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No hay usuarios registrados aún.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden md:table-cell">Company</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Registro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map(u => (
                <TableRow key={u.user_id}>
                  <TableCell className="font-medium">{u.full_name ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Select
                      value={u.company_id ?? 'none'}
                      onValueChange={val => handleCompanyChange(u.user_id, val)}
                      disabled={updatingCompany === u.user_id}
                    >
                      <SelectTrigger className="w-36 h-8 text-xs">
                        {updatingCompany === u.user_id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin company</SelectItem>
                        {companies.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={u.role ?? 'none'}
                      onValueChange={val => handleRoleChange(u.user_id, val)}
                      disabled={updatingRole === u.user_id}
                    >
                      <SelectTrigger className="w-28 h-8 text-xs">
                        {updatingRole === u.user_id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <SelectValue />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                        <SelectItem value="none">Sin rol</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {new Date(u.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sin resultados para "{userQuery}"</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminPanel;
