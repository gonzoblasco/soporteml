import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Trash2, Plus, Copy, Loader2, Mail, Building2, Users, Shield, UserCircle, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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

const SUPER_ADMIN_EMAIL = 'gonzoblasco@icloud.com';

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

  if (user?.email !== SUPER_ADMIN_EMAIL) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Panel de Administración</h1>
      </div>

      <Tabs defaultValue="inquiries">
        <TabsList className="mb-4">
          <TabsTrigger value="inquiries" className="gap-2"><Mail className="w-4 h-4" />Consultas</TabsTrigger>
          <TabsTrigger value="companies" className="gap-2"><Building2 className="w-4 h-4" />Companies</TabsTrigger>
          <TabsTrigger value="users" className="gap-2"><UserCircle className="w-4 h-4" />Usuarios</TabsTrigger>
        </TabsList>

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

/* ─── Companies Tab ─── */
const CompaniesTab = () => {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchCompanies = async () => {
    const { data: companiesData, error } = await supabase
      .from('companies')
      .select('id, name, invite_code, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching companies:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    if (!companiesData) { setLoading(false); return; }

    // Fetch member counts and meli connection status in parallel
    const companyIds = companiesData.map(c => c.id);

    const [profilesRes, meliRes] = await Promise.all([
      supabase.from('profiles').select('company_id').in('company_id', companyIds),
      supabase.from('meli_tokens').select('company_id').in('company_id', companyIds),
    ]);

    const memberCounts: Record<string, number> = {};
    (profilesRes.data ?? []).forEach(p => {
      memberCounts[p.company_id!] = (memberCounts[p.company_id!] ?? 0) + 1;
    });

    const meliSet = new Set((meliRes.data ?? []).map(t => t.company_id));

    setCompanies(companiesData.map(c => ({
      ...c,
      member_count: memberCounts[c.id] ?? 0,
      has_meli: meliSet.has(c.id),
    })));
    setLoading(false);
  };

  useEffect(() => { fetchCompanies(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const { error } = await supabase.from('companies').insert({ name: newName.trim() });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Company creada' });
      setNewName('');
      await fetchCompanies();
    }
    setCreating(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la company "${name}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setCompanies(prev => prev.filter(c => c.id !== id));
      toast({ title: 'Company eliminada' });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Código copiado' });
  };

  const { query: companyQuery, setQuery: setCompanyQuery, filtered: filteredCompanies } = useSearch(companies, ['name', 'invite_code']);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* Create company form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Crear nueva Company</CardTitle>
          <CardDescription>Se genera un invite_code automáticamente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="company-name">Nombre</Label>
              <Input
                id="company-name"
                placeholder="Ej: Tienda de Juan"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()} className="gap-2">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Crear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Companies table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg">Companies registradas</CardTitle>
              <CardDescription>{filteredCompanies.length} de {companies.length} company{companies.length !== 1 ? 's' : ''}</CardDescription>
            </div>
            {companies.length > 0 && <SearchInput value={companyQuery} onChange={setCompanyQuery} placeholder="Buscar company..." />}
          </div>
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No hay companies aún.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Invite Code</TableHead>
                  <TableHead className="hidden md:table-cell">Miembros</TableHead>
                  <TableHead className="hidden md:table-cell">MeLi</TableHead>
                  <TableHead>Creada</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <button
                        onClick={() => copyCode(c.invite_code)}
                        className="inline-flex items-center gap-1.5 font-mono text-xs bg-muted px-2 py-1 rounded hover:bg-accent transition-colors"
                      >
                        {c.invite_code}
                        <Copy className="w-3 h-3" />
                      </button>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />{c.member_count}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className={`inline-block w-2 h-2 rounded-full ${c.has_meli ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(c.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id, c.name)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCompanies.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Sin resultados para "{companyQuery}"</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.rpc('get_admin_users');
      if (error) {
        console.error('Error fetching users:', error);
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
      setUsers((data as AdminUser[]) ?? []);
      setLoading(false);
    };
    fetchUsers();
  }, []);

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
                  <TableCell className="hidden md:table-cell text-muted-foreground">{u.company_name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                      {u.role ?? 'sin rol'}
                    </Badge>
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
