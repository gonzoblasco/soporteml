import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Trash2, Plus, Copy, Loader2, Users, Search, Link2, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const SearchInput = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
    <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="pl-9" />
  </div>
);

const useSearch = <T,>(items: T[], keys: (keyof T)[]) => {
  const [query, setQuery] = useState('');
  const filtered = query.trim()
    ? items.filter(item => keys.some(k => { const val = item[k]; return typeof val === 'string' && val.toLowerCase().includes(query.toLowerCase()); }))
    : items;
  return { query, setQuery, filtered };
};

interface CompanyRow {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
  member_count: number;
  has_meli: boolean;
}

interface UnassignedUser {
  id: string;
  email: string;
  full_name: string | null;
}

interface CreatedCompanyInfo {
  id: string;
  name: string;
  invite_code: string;
  assigned_user_email?: string;
}

const CompaniesTab = () => {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [unassignedUsers, setUnassignedUsers] = useState<UnassignedUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('none');
  const [createdCompany, setCreatedCompany] = useState<CreatedCompanyInfo | null>(null);

  const fetchCompanies = async () => {
    const { data: companiesData, error } = await supabase
      .from('companies')
      .select('id, name, invite_code, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    if (!companiesData) { setLoading(false); return; }

    const companyIds = companiesData.map(c => c.id);
    const [membershipsRes, meliRes] = await Promise.all([
      supabase.from('memberships').select('company_id').eq('status', 'active').in('company_id', companyIds),
      supabase.from('meli_tokens').select('company_id').in('company_id', companyIds),
    ]);

    const memberCounts: Record<string, number> = {};
    (membershipsRes.data ?? []).forEach(m => {
      memberCounts[m.company_id] = (memberCounts[m.company_id] ?? 0) + 1;
    });
    const meliSet = new Set((meliRes.data ?? []).map(t => t.company_id));

    setCompanies(companiesData.map(c => ({
      ...c,
      member_count: memberCounts[c.id] ?? 0,
      has_meli: meliSet.has(c.id),
    })));
    setLoading(false);
  };

  const fetchUnassignedUsers = async () => {
    const { data } = await supabase.rpc('get_admin_users');
    if (data) {
      const unassigned = (data as any[]).filter(u => !u.company_id).map(u => ({
        id: u.user_id,
        email: u.email,
        full_name: u.full_name,
      }));
      setUnassignedUsers(unassigned);
    }
  };

  useEffect(() => {
    fetchCompanies();
    fetchUnassignedUsers();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);

    // 1. Create company
    const { data: newCompany, error } = await supabase
      .from('companies')
      .insert({ name: newName.trim() })
      .select('id, name, invite_code')
      .single();

    if (error || !newCompany) {
      toast({ title: 'Error', description: error?.message ?? 'No se pudo crear', variant: 'destructive' });
      setCreating(false);
      return;
    }

    let assignedEmail: string | undefined;

    // 2. If a user was selected, create membership via RPC (Hito 5)
    if (selectedUserId && selectedUserId !== 'none') {
      const selectedUser = unassignedUsers.find(u => u.id === selectedUserId);

      const { error: membershipErr } = await supabase.rpc('add_company_membership' as any, {
        _user_id: selectedUserId,
        _company_id: newCompany.id,
        _role: 'admin',
      });

      if (membershipErr) {
        toast({ title: 'Empresa creada, pero error al asignar usuario', description: membershipErr.message, variant: 'destructive' });
      } else {
        assignedEmail = selectedUser?.email;
      }
    }

    // 3. Show success with invite info
    setCreatedCompany({
      id: newCompany.id,
      name: newCompany.name,
      invite_code: newCompany.invite_code,
      assigned_user_email: assignedEmail,
    });

    setNewName('');
    setSelectedUserId('none');
    await Promise.all([fetchCompanies(), fetchUnassignedUsers()]);
    setCreating(false);

    toast({ title: 'Company creada exitosamente' });
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la company "${name}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setCompanies(prev => prev.filter(c => c.id !== id));
      if (createdCompany?.id === id) setCreatedCompany(null);
      toast({ title: 'Company eliminada' });
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: 'Código copiado' });
  };

  const copyInviteLink = (code: string) => {
    const link = `${window.location.origin}/login?code=${code}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Link de invitación copiado' });
  };

  const { query: companyQuery, setQuery: setCompanyQuery, filtered: filteredCompanies } = useSearch(companies, ['name', 'invite_code']);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      {/* Create company form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Crear nueva Company</CardTitle>
          <CardDescription>Se genera un invite_code automáticamente. Asigná un usuario existente o compartí el link de invitación.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="company-name">Nombre de la empresa</Label>
              <Input
                id="company-name"
                placeholder="Ej: Tienda de Juan"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Admin inicial (opcional)</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Sin asignar — usar invite link" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar — usar invite link</SelectItem>
                  {unassignedUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name ?? u.email} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {unassignedUsers.length === 0 && (
                <p className="text-xs text-muted-foreground">No hay usuarios sin empresa. Usá el invite link.</p>
              )}
            </div>
          </div>
          <Button onClick={handleCreate} disabled={creating || !newName.trim()} className="gap-2">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Crear empresa
          </Button>
        </CardContent>
      </Card>

      {/* Post-creation banner */}
      {createdCompany && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="space-y-2 flex-1">
                <p className="font-medium text-foreground">
                  "{createdCompany.name}" creada exitosamente
                </p>
                {createdCompany.assigned_user_email ? (
                  <p className="text-sm text-muted-foreground">
                    Admin asignado: <span className="font-medium text-foreground">{createdCompany.assigned_user_email}</span>
                  </p>
                ) : (
                  <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 px-3 py-2">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      ⚠️ Esta empresa no tiene ningún usuario asignado todavía.
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      Compartí el link de invitación para que el primer admin se registre. Sin al menos un admin, la empresa no podrá operar.
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => copyCode(createdCompany.invite_code)}>
                    <Copy className="w-3 h-3" />
                    Código: {createdCompany.invite_code}
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => copyInviteLink(createdCompany.invite_code)}>
                    <Link2 className="w-3 h-3" />
                    Copiar link de invitación
                  </Button>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground mt-1" onClick={() => setCreatedCompany(null)}>
                  Cerrar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.name}
                      {c.member_count === 0 && (
                        <Badge variant="outline" className="ml-2 text-[10px] border-amber-300 text-amber-600 dark:text-amber-400">Sin usuarios</Badge>
                      )}
                    </TableCell>
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
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => copyInviteLink(c.invite_code)} className="h-8 w-8 text-muted-foreground hover:text-primary" title="Copiar link de invitación">
                          <Link2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id, c.name)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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

export default CompaniesTab;
