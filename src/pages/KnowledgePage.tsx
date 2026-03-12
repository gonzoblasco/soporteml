import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Loader2, BookOpen, Plus, Search, Brain, Trash2, ArrowLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

interface KnowledgeEntry {
  id: string;
  company_id: string;
  title: string;
  content: string;
  type: string;
  scope: string;
  ai_visible: boolean;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  politica: { label: 'Política', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  faq: { label: 'FAQ', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  guia: { label: 'Guía', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  restriccion: { label: 'Restricción', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
};

const KnowledgePage = () => {
  const { user, currentCompanyId } = useAuth();
  const isMobile = useIsMobile();
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [saving, setSaving] = useState(false);

  // Editor state
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState('politica');
  const [editAiVisible, setEditAiVisible] = useState(true);
  const [editIsActive, setEditIsActive] = useState(true);
  const [editPriority, setEditPriority] = useState(0);

  const fetchEntries = useCallback(async () => {
    if (!currentCompanyId) return;
    const { data } = await supabase
      .from('knowledge_entries')
      .select('*')
      .eq('company_id', currentCompanyId)
      .order('priority', { ascending: false })
      .order('updated_at', { ascending: false });
    setEntries((data ?? []) as unknown as KnowledgeEntry[]);
    setLoading(false);
  }, [currentCompanyId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const selectedEntry = entries.find(e => e.id === selectedId) || null;

  // Populate editor when selection changes
  useEffect(() => {
    if (selectedEntry) {
      setEditTitle(selectedEntry.title);
      setEditContent(selectedEntry.content);
      setEditType(selectedEntry.type);
      setEditAiVisible(selectedEntry.ai_visible);
      setEditIsActive(selectedEntry.is_active);
      setEditPriority(selectedEntry.priority);
    }
  }, [selectedEntry]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    if (isMobile) setShowEditor(true);
  };

  const handleNew = async () => {
    if (!currentCompanyId || !user) return;
    const { data, error } = await supabase
      .from('knowledge_entries')
      .insert({
        company_id: currentCompanyId,
        title: 'Nuevo artículo',
        content: '',
        type: 'politica',
        created_by: user.id,
        updated_by: user.id,
      } as any)
      .select('id')
      .single();

    if (error) { toast.error('Error al crear artículo'); return; }
    toast.success('Artículo creado');
    await fetchEntries();
    setSelectedId((data as any).id);
    if (isMobile) setShowEditor(true);
  };

  const handleSave = async () => {
    if (!selectedId || !user) return;
    setSaving(true);
    const { error } = await supabase
      .from('knowledge_entries')
      .update({
        title: editTitle,
        content: editContent,
        type: editType,
        ai_visible: editAiVisible,
        is_active: editIsActive,
        priority: editPriority,
        updated_by: user.id,
      } as any)
      .eq('id', selectedId);

    setSaving(false);
    if (error) { toast.error('Error al guardar'); return; }
    toast.success('Guardado');
    fetchEntries();
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    const { error } = await supabase
      .from('knowledge_entries')
      .delete()
      .eq('id', selectedId);

    if (error) { toast.error('Error al eliminar'); return; }
    toast.success('Artículo eliminado');
    setSelectedId(null);
    if (isMobile) setShowEditor(false);
    fetchEntries();
  };

  const filtered = entries.filter(e => {
    if (filterType !== 'all' && e.type !== filterType) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !e.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const listPanel = (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[120px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="politica">Políticas</SelectItem>
              <SelectItem value="faq">FAQ</SelectItem>
              <SelectItem value="guia">Guías</SelectItem>
              <SelectItem value="restriccion">Restricciones</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleNew} size="sm" className="w-full gap-1.5">
          <Plus className="w-4 h-4" /> Nuevo artículo
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12">
            <BookOpen className="w-8 h-8 text-muted-foreground/20 mb-2" />
            <p className="text-sm text-muted-foreground">
              {entries.length === 0 ? 'Creá tu primer artículo de conocimiento.' : 'Sin resultados.'}
            </p>
          </div>
        ) : (
          filtered.map(entry => {
            const cfg = TYPE_CONFIG[entry.type] || TYPE_CONFIG.politica;
            return (
              <button
                key={entry.id}
                onClick={() => handleSelect(entry.id)}
                className={`w-full text-left px-3 py-2.5 border-b border-border hover:bg-accent/50 transition-colors ${
                  selectedId === entry.id ? 'bg-accent' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.className}`}>
                    {cfg.label}
                  </span>
                  {entry.ai_visible && (
                    <Brain className="w-3 h-3 text-primary" />
                  )}
                  {!entry.is_active && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">Inactivo</span>
                  )}
                </div>
                <p className="text-sm font-medium truncate text-foreground">{entry.title}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.content || 'Sin contenido'}</p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const editorPanel = selectedEntry ? (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="p-4 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Título</Label>
          <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="text-sm" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Tipo</Label>
          <Select value={editType} onValueChange={setEditType}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="politica">Política</SelectItem>
              <SelectItem value="faq">FAQ</SelectItem>
              <SelectItem value="guia">Guía</SelectItem>
              <SelectItem value="restriccion">Restricción</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Contenido</Label>
          <Textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            rows={8}
            className="text-sm resize-y"
            maxLength={2000}
          />
          <p className="text-[10px] text-muted-foreground text-right">{editContent.length}/2000</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Prioridad ({editPriority})</Label>
          <Slider
            value={[editPriority]}
            onValueChange={v => setEditPriority(v[0])}
            min={0}
            max={10}
            step={1}
            className="w-full"
          />
          <p className="text-[10px] text-muted-foreground">Mayor prioridad = más relevante para la IA</p>
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-sm">Visible para IA</Label>
          <Switch checked={editAiVisible} onCheckedChange={setEditAiVisible} />
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-sm">Activo</Label>
          <Switch checked={editIsActive} onCheckedChange={setEditIsActive} />
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving} className="flex-1 gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Guardar
          </Button>
          <Button variant="destructive" size="icon" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  ) : (
    <div className="h-full flex flex-col items-center justify-center text-center px-8">
      <BookOpen className="w-10 h-10 text-muted-foreground/20 mb-3" />
      <p className="text-sm text-muted-foreground">
        Seleccioná un artículo o creá uno nuevo.
      </p>
    </div>
  );

  // Mobile layout
  if (isMobile) {
    if (showEditor && selectedEntry) {
      return (
        <div className="h-full flex flex-col">
          <div className="px-3 py-2 border-b border-border">
            <Button variant="ghost" size="sm" onClick={() => setShowEditor(false)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Volver
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">{editorPanel}</div>
        </div>
      );
    }
    return <div className="h-full">{listPanel}</div>;
  }

  // Desktop split view
  return (
    <div className="h-full flex">
      <div className="w-80 shrink-0 border-r border-border">{listPanel}</div>
      <div className="flex-1 overflow-hidden">{editorPanel}</div>
    </div>
  );
};

export default KnowledgePage;
