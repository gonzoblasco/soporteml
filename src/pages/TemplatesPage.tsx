import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-init';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, FileText, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CATEGORIES = [
  { value: 'envíos', label: 'Envíos' },
  { value: 'stock', label: 'Stock' },
  { value: 'devoluciones', label: 'Devoluciones' },
  { value: 'factura', label: 'Factura' },
  { value: 'garantía', label: 'Garantía' },
  { value: 'general', label: 'General' },
];

interface Template {
  id: string;
  title: string;
  category: string;
  content: string;
  variables: string[];
  created_at: string;
  updated_at: string;
}

const TemplatesPage = () => {
  const { currentCompanyId, userRole } = useAuth();
  const isAdmin = userRole === 'admin';
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('general');
  const [content, setContent] = useState('');

  const fetchTemplates = async () => {
    if (!currentCompanyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('company_id', currentCompanyId)
      .order('updated_at', { ascending: false });
    if (error) {
      toast.error('Error al cargar plantillas');
    } else {
      setTemplates((data ?? []).map(t => ({ ...t, variables: Array.isArray(t.variables) ? t.variables as string[] : [] })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchTemplates(); }, [currentCompanyId]);

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{(\w+)\}/g);
    return matches ? [...new Set(matches)] : [];
  };

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setCategory('general');
    setContent('');
    setDialogOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setTitle(t.title);
    setCategory(t.category);
    setContent(t.content);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentCompanyId || !title.trim() || !content.trim()) {
      toast.error('Completá título y contenido');
      return;
    }
    const variables = extractVariables(content);
    if (editing) {
      const { error } = await supabase
        .from('templates')
        .update({ title: title.trim(), category, content: content.trim(), variables })
        .eq('id', editing.id);
      if (error) { toast.error('Error: ' + error.message); return; }
      toast.success('Plantilla actualizada');
    } else {
      const { error } = await supabase
        .from('templates')
        .insert({ company_id: currentCompanyId, title: title.trim(), category, content: content.trim(), variables });
      if (error) { toast.error('Error: ' + error.message); return; }
      toast.success('Plantilla creada');
    }
    setDialogOpen(false);
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('templates').delete().eq('id', id);
    if (error) { toast.error('Error: ' + error.message); return; }
    toast.info('Plantilla eliminada');
    fetchTemplates();
  };

  const filtered = templates.filter(t => {
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.content.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === 'all' || t.category === filterCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-4xl mx-auto w-full overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Plantillas</h1>
          <p className="text-sm text-muted-foreground mt-1">Respuestas rápidas reutilizables</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} className="gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            Nueva plantilla
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar plantillas…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {CATEGORIES.map(c => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{templates.length === 0 ? 'Todavía no tenés plantillas. Creá la primera.' : 'Sin resultados para tu búsqueda.'}</p>
          </div>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-2">
            {filtered.map(t => (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="rounded-lg border border-border bg-card p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-foreground truncate">{t.title}</h3>
                      <Badge variant="secondary" className="text-[10px] shrink-0">{t.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{t.content}</p>
                    {t.variables.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {t.variables.map(v => (
                          <span key={v} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">{v}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
                            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(t.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar plantilla' : 'Nueva plantilla'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Título</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Tiempo de envío estándar" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Categoría</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Contenido</label>
              <Textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Usá {nombre}, {producto}, {tiempo_envio} como variables…"
                className="min-h-[120px]"
              />
              {extractVariables(content).length > 0 && (
                <div className="flex gap-1 mt-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Variables:</span>
                  {extractVariables(content).map(v => (
                    <span key={v} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">{v}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!title.trim() || !content.trim()}>
              {editing ? 'Guardar cambios' : 'Crear plantilla'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TemplatesPage;
