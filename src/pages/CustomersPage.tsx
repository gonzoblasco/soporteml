import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import EmptyState from '@/components/EmptyState';
import { Search, RefreshCw, Loader2, Users, X, Plus, Check, Star } from 'lucide-react';
import { toast } from 'sonner';
import { timeAgoEs } from '@/lib/timeAgo';

interface Customer {
  id: string;
  company_id: string;
  buyer_id: string;
  buyer_nickname: string | null;
  notes: string | null;
  tags: string[];
  total_questions: number;
  last_interaction_at: string | null;
}

interface CustomerTag {
  id: string;
  name: string;
  color: string;
}

interface QuestionRow {
  id: string;
  question_text: string;
  ai_category: string | null;
  status: string;
  created_at: string;
  requires_human: boolean;
}

const TAG_COLORS = ['#0F6E56', '#378ADD', '#534AB7', '#BA7517', '#A32D2D', '#888888'];

function initialOf(s: string | null | undefined): string {
  if (!s) return '?';
  return s.trim().charAt(0).toUpperCase() || '?';
}

const CustomersPage = () => {
  const { currentCompanyId, userRole } = useAuth();
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Customer | null>(null);

  // Drawer state
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [savedHint, setSavedHint] = useState(false);
  const [history, setHistory] = useState<QuestionRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Tag creation
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [creatingTag, setCreatingTag] = useState(false);

  const isAdmin = userRole === 'admin';

  // ─── Data fetching ───
  const fetchAll = useCallback(async () => {
    if (!currentCompanyId) return;
    setLoading(true);
    const [customersRes, tagsRes] = await Promise.all([
      supabase
        .from('customers')
        .select('*')
        .eq('company_id', currentCompanyId)
        .order('last_interaction_at', { ascending: false, nullsFirst: false }),
      supabase
        .from('customer_tags')
        .select('id, name, color')
        .eq('company_id', currentCompanyId)
        .order('name'),
    ]);

    if (customersRes.error) {
      toast.error('No pudimos cargar los clientes');
    } else {
      setCustomers(customersRes.data ?? []);
    }
    if (!tagsRes.error) {
      setTags(tagsRes.data ?? []);
    }
    setLoading(false);
  }, [currentCompanyId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Filtering ───
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c =>
      (c.buyer_nickname?.toLowerCase().includes(q)) ||
      c.buyer_id.toLowerCase().includes(q)
    );
  }, [customers, search]);

  // ─── Backfill ───
  const handleSync = async () => {
    if (!currentCompanyId || syncing) return;
    setSyncing(true);
    const { data, error } = await supabase.rpc('backfill_customers', {
      _company_id: currentCompanyId,
    });
    if (error) {
      toast.error('No pudimos sincronizar', { description: error.message });
    } else {
      const upserted = (data as { upserted?: number } | null)?.upserted ?? 0;
      toast.success(`Sincronizados ${upserted} clientes`);
      await fetchAll();
    }
    setSyncing(false);
  };

  // ─── Drawer: select customer ───
  const openCustomer = useCallback(async (c: Customer) => {
    setSelected(c);
    setNotes(c.notes ?? '');
    setSavedHint(false);
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from('questions')
      .select('id, question_text, ai_category, status, created_at, requires_human')
      .eq('company_id', c.company_id)
      .eq('buyer_id', c.buyer_id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (!error) setHistory(data ?? []);
    setHistoryLoading(false);
  }, []);

  // ─── Notes auto-save (debounce 1s) ───
  useEffect(() => {
    if (!selected) return;
    if ((selected.notes ?? '') === notes) return;

    const t = setTimeout(async () => {
      setSavingNotes(true);
      const { error } = await supabase
        .from('customers')
        .update({ notes })
        .eq('id', selected.id);
      setSavingNotes(false);
      if (error) {
        toast.error('No pudimos guardar las notas');
      } else {
        setSavedHint(true);
        setSelected(prev => prev ? { ...prev, notes } : prev);
        setCustomers(prev => prev.map(c => c.id === selected.id ? { ...c, notes } : c));
        setTimeout(() => setSavedHint(false), 2000);
      }
    }, 1000);

    return () => clearTimeout(t);
  }, [notes, selected]);

  // ─── Tags on customer ───
  const updateCustomerTags = async (next: string[]) => {
    if (!selected) return;
    const previous = selected.tags;
    setSelected({ ...selected, tags: next });
    setCustomers(prev => prev.map(c => c.id === selected.id ? { ...c, tags: next } : c));
    const { error } = await supabase
      .from('customers')
      .update({ tags: next })
      .eq('id', selected.id);
    if (error) {
      toast.error('No pudimos actualizar las etiquetas');
      setSelected(prev => prev ? { ...prev, tags: previous } : prev);
      setCustomers(prev => prev.map(c => c.id === selected.id ? { ...c, tags: previous } : c));
    }
  };

  const removeTag = (name: string) => {
    if (!selected) return;
    updateCustomerTags(selected.tags.filter(t => t !== name));
  };

  const addTag = (name: string) => {
    if (!selected) return;
    if (selected.tags.includes(name)) return;
    updateCustomerTags([...selected.tags, name]);
  };

  // ─── Create new tag (admin only) ───
  const handleCreateTag = async () => {
    if (!isAdmin || !currentCompanyId) return;
    const name = newTagName.trim();
    if (!name) return;
    setCreatingTag(true);
    const { data, error } = await supabase
      .from('customer_tags')
      .insert({ company_id: currentCompanyId, name, color: newTagColor })
      .select()
      .single();
    setCreatingTag(false);
    if (error) {
      toast.error('No pudimos crear la etiqueta', { description: error.message });
      return;
    }
    setTags(prev => [...prev, data as CustomerTag].sort((a, b) => a.name.localeCompare(b.name)));
    if (selected) addTag(name);
    setNewTagName('');
    toast.success(`Etiqueta "${name}" creada`);
  };

  const tagByName = useMemo(() => {
    const map = new Map<string, CustomerTag>();
    tags.forEach(t => map.set(t.name, t));
    return map;
  }, [tags]);

  const availableToAdd = useMemo(() => {
    if (!selected) return tags;
    return tags.filter(t => !selected.tags.includes(t.name));
  }, [tags, selected]);

  // ─── History click → navigate ───
  const openQuestion = (q: QuestionRow) => {
    if (q.requires_human || q.status === 'needs_human') {
      navigate('/priority');
    } else {
      navigate('/inbox');
    }
  };

  return (
    <div className="h-screen flex bg-background">
      {/* Lista — columna izquierda */}
      <div className="w-[320px] border-r border-border flex flex-col shrink-0">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-foreground">Clientes</h1>
              <p className="text-xs text-muted-foreground">{customers.length} {customers.length === 1 ? 'cliente' : 'clientes'}</p>
            </div>
            <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing} className="h-8 gap-1.5">
              {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span className="text-xs">Sincronizar</span>
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o ID"
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Users}
                title={customers.length === 0 ? 'Sin clientes todavía' : 'Sin resultados'}
                description={customers.length === 0
                  ? 'Sincronizá para importar los compradores de tus preguntas existentes.'
                  : 'Probá otro término de búsqueda.'}
              />
            </div>
          ) : (
            <ul className="py-1">
              {filtered.map((c) => {
                const isActive = selected?.id === c.id;
                const display = c.buyer_nickname || c.buyer_id;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => openCustomer(c)}
                      className={`w-full text-left px-3 py-2.5 flex items-start gap-3 hover:bg-muted/50 transition-colors ${isActive ? 'bg-muted' : ''}`}
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                        {initialOf(display)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-foreground truncate">{display}</span>
                          {c.total_questions >= 5 && <Star className="w-3 h-3 text-primary fill-primary shrink-0" />}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {c.total_questions} {c.total_questions === 1 ? 'pregunta' : 'preguntas'}
                          {c.last_interaction_at ? ` · ${timeAgoEs(c.last_interaction_at)}` : ''}
                        </div>
                        {c.tags.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {c.tags.slice(0, 3).map(name => {
                              const t = tagByName.get(name);
                              return (
                                <span
                                  key={name}
                                  className="text-[10px] px-1.5 py-0.5 rounded-full text-white"
                                  style={{ backgroundColor: t?.color ?? '#888' }}
                                >
                                  {name}
                                </span>
                              );
                            })}
                            {c.tags.length > 3 && (
                              <span className="text-[10px] text-muted-foreground">+{c.tags.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </div>

      {/* Vista principal vacía */}
      <div className="flex-1 hidden md:flex items-center justify-center text-muted-foreground text-sm">
        Seleccioná un cliente para ver su detalle.
      </div>

      {/* Drawer lateral */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-[480px] p-0 flex flex-col">
          {selected && (
            <>
              <SheetHeader className="p-5 border-b border-border space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-lg font-medium text-primary shrink-0">
                    {initialOf(selected.buyer_nickname || selected.buyer_id)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-base text-left truncate">
                      {selected.buyer_nickname || 'Sin nickname'}
                    </SheetTitle>
                    <p className="text-[11px] font-mono text-muted-foreground mt-0.5 truncate">
                      ID: {selected.buyer_id}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {selected.total_questions} {selected.total_questions === 1 ? 'pregunta' : 'preguntas'}
                      </Badge>
                      {selected.total_questions >= 5 && (
                        <Badge className="text-[10px] gap-1 bg-primary/15 text-primary hover:bg-primary/20 border-0">
                          <Star className="w-3 h-3 fill-current" />
                          Cliente frecuente
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </SheetHeader>

              <ScrollArea className="flex-1">
                <div className="p-5 space-y-6">
                  {/* Notas */}
                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notas</h3>
                      <span className="text-[11px] text-muted-foreground h-4">
                        {savingNotes ? 'Guardando…' : savedHint ? 'Guardado ✓' : ''}
                      </span>
                    </div>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Agregar notas sobre este cliente..."
                      className="min-h-[100px] text-sm resize-none"
                    />
                  </section>

                  {/* Tags */}
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Etiquetas</h3>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {selected.tags.length === 0 && (
                        <p className="text-xs text-muted-foreground">Sin etiquetas</p>
                      )}
                      {selected.tags.map(name => {
                        const t = tagByName.get(name);
                        return (
                          <span
                            key={name}
                            className="inline-flex items-center gap-1 text-xs pl-2 pr-1 py-0.5 rounded-full text-white"
                            style={{ backgroundColor: t?.color ?? '#888' }}
                          >
                            {name}
                            <button
                              onClick={() => removeTag(name)}
                              className="hover:bg-black/20 rounded-full p-0.5"
                              aria-label={`Quitar ${name}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                            <Plus className="w-3 h-3" />
                            Agregar etiqueta
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-1" align="start">
                          {availableToAdd.length === 0 ? (
                            <p className="text-xs text-muted-foreground p-2">No hay etiquetas disponibles.</p>
                          ) : (
                            <ul className="max-h-48 overflow-y-auto">
                              {availableToAdd.map(t => (
                                <li key={t.id}>
                                  <button
                                    onClick={() => addTag(t.name)}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded"
                                  >
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                                    {t.name}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </PopoverContent>
                      </Popover>

                      {isAdmin && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                              <Plus className="w-3 h-3" />
                              Nueva etiqueta
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-3 space-y-2" align="start">
                            <Input
                              value={newTagName}
                              onChange={(e) => setNewTagName(e.target.value)}
                              placeholder="Nombre"
                              className="h-8 text-sm"
                            />
                            <div className="flex gap-1.5">
                              {TAG_COLORS.map(c => (
                                <button
                                  key={c}
                                  onClick={() => setNewTagColor(c)}
                                  className="w-7 h-7 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: c }}
                                  aria-label={`Color ${c}`}
                                >
                                  {newTagColor === c && <Check className="w-3.5 h-3.5 text-white" />}
                                </button>
                              ))}
                            </div>
                            <Button
                              size="sm"
                              onClick={handleCreateTag}
                              disabled={creatingTag || !newTagName.trim()}
                              className="w-full h-8 text-xs"
                            >
                              {creatingTag ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Crear etiqueta'}
                            </Button>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </section>

                  {/* Historial */}
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Historial reciente
                    </h3>
                    {historyLoading ? (
                      <div className="py-6 flex justify-center">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : history.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Sin preguntas registradas.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {history.map(q => (
                          <li key={q.id}>
                            <button
                              onClick={() => openQuestion(q)}
                              className="w-full text-left p-2.5 rounded-md border border-border hover:bg-muted/50 transition-colors"
                            >
                              <p className="text-sm text-foreground line-clamp-2 mb-1.5">{q.question_text}</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                {q.ai_category && (
                                  <Badge variant="outline" className="text-[10px] py-0 h-4">{q.ai_category}</Badge>
                                )}
                                <span className="text-[11px] text-muted-foreground">{timeAgoEs(q.created_at)}</span>
                                <span className="text-[11px] text-muted-foreground">·</span>
                                <span className="text-[11px] text-muted-foreground capitalize">{q.status}</span>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CustomersPage;
