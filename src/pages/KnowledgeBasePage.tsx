import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, RefreshCw, Search, Loader2, AlertCircle, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

function timeAgoEs(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'hace unos segundos';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months} m`;
  return `hace ${Math.floor(months / 12)} a`;
}

type SourceType = 'text' | 'markdown';
type ArticleStatus = 'pending' | 'processing' | 'ready' | 'error';

interface KbArticle {
  id: string;
  title: string;
  source_type: SourceType;
  raw_content: string;
  status: ArticleStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface SearchMatch {
  chunk_id: string;
  article_id: string;
  article_title: string;
  content: string;
  similarity: number;
}

const StatusBadge = ({ status }: { status: ArticleStatus }) => {
  const map: Record<ArticleStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
    pending: { label: 'Pendiente', variant: 'outline', icon: <Clock className="w-3 h-3" /> },
    processing: { label: 'Procesando', variant: 'secondary', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    ready: { label: 'Listo', variant: 'default', icon: <CheckCircle2 className="w-3 h-3" /> },
    error: { label: 'Error', variant: 'destructive', icon: <AlertCircle className="w-3 h-3" /> },
  };
  const cfg = map[status];
  return <Badge variant={cfg.variant} className="gap-1">{cfg.icon}{cfg.label}</Badge>;
};

const KnowledgeBasePage = () => {
  const { currentCompanyId } = useAuth();
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form
  const [title, setTitle] = useState('');
  const [sourceType, setSourceType] = useState<SourceType>('text');
  const [content, setContent] = useState('');

  // Search
  const [query, setQuery] = useState('');
  const [matchCount, setMatchCount] = useState(5);
  const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
  const [searching, setSearching] = useState(false);

  const loadArticles = useCallback(async () => {
    if (!currentCompanyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('kb_articles')
      .select('*')
      .eq('company_id', currentCompanyId)
      .order('created_at', { ascending: false });
    if (error) {
      toast.error('Error cargando artículos: ' + error.message);
    } else {
      setArticles((data ?? []) as KbArticle[]);
    }
    setLoading(false);
  }, [currentCompanyId]);

  useEffect(() => {
    loadArticles();
    if (!currentCompanyId) return;
    const channel = supabase
      .channel(`kb-articles-${currentCompanyId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'kb_articles', filter: `company_id=eq.${currentCompanyId}` },
        () => loadArticles())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentCompanyId, loadArticles]);

  // Fallback polling: while any article is processing/pending, refresh every 3s
  useEffect(() => {
    const hasInFlight = articles.some((a) => a.status === 'processing' || a.status === 'pending');
    if (!hasInFlight) return;
    const interval = setInterval(() => loadArticles(), 3000);
    return () => clearInterval(interval);
  }, [articles, loadArticles]);

  const resetForm = () => {
    setTitle('');
    setSourceType('text');
    setContent('');
  };

  const handleCreate = async () => {
    if (!currentCompanyId) return;
    const t = title.trim();
    const c = content.trim();
    if (t.length < 1 || t.length > 200) {
      toast.error('El título debe tener entre 1 y 200 caracteres');
      return;
    }
    if (c.length < 1 || c.length > 50000) {
      toast.error('El contenido debe tener entre 1 y 50000 caracteres');
      return;
    }
    setSubmitting(true);
    // Ensure session is hydrated before insert (avoids anon-key fallback that breaks RLS)
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      toast.error('Sesión expirada. Iniciá sesión de nuevo.');
      setSubmitting(false);
      return;
    }
    const userId = sessionData.session.user.id;
    const { data: inserted, error } = await supabase
      .from('kb_articles')
      .insert({
        company_id: currentCompanyId,
        title: t,
        source_type: sourceType,
        raw_content: c,
        status: 'pending',
        created_by: userId,
      })
      .select('id')
      .single();
    if (error || !inserted) {
      toast.error('Error creando artículo: ' + (error?.message ?? 'desconocido'));
      setSubmitting(false);
      return;
    }
    // Trigger processing
    const { error: procErr } = await supabase.functions.invoke('kb-process-article', {
      body: { article_id: inserted.id, company_id: currentCompanyId },
    });
    if (procErr) {
      toast.error('Error iniciando procesamiento: ' + procErr.message);
    } else {
      toast.success('Artículo creado y procesándose');
    }
    resetForm();
    setDrawerOpen(false);
    setSubmitting(false);
  };

  const handleReprocess = async (article: KbArticle) => {
    if (!currentCompanyId) return;
    toast.info('Reprocesando artículo...');
    const { error } = await supabase.functions.invoke('kb-process-article', {
      body: { article_id: article.id, company_id: currentCompanyId },
    });
    if (error) toast.error('Error: ' + error.message);
    else toast.success('Reproceso iniciado');
  };

  const handleDelete = async (article: KbArticle) => {
    if (!currentCompanyId) return;
    if (!confirm(`¿Borrar "${article.title}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.functions.invoke('kb-delete-article', {
      body: { article_id: article.id, company_id: currentCompanyId },
    });
    if (error) toast.error('Error: ' + error.message);
    else toast.success('Artículo eliminado');
  };

  const handleSearch = async () => {
    if (!currentCompanyId) return;
    const q = query.trim();
    if (!q) {
      toast.error('Ingresá una búsqueda');
      return;
    }
    setSearching(true);
    setSearchResults([]);
    const { data, error } = await supabase.functions.invoke('kb-search', {
      body: { company_id: currentCompanyId, query: q, match_count: matchCount, match_threshold: 0.3 },
    });
    if (error) {
      toast.error('Error: ' + error.message);
    } else {
      setSearchResults((data?.matches ?? []) as SearchMatch[]);
      if (!data?.matches?.length) toast.info('Sin resultados');
    }
    setSearching(false);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h1 className="text-xl font-semibold">Base de conocimiento</h1>
          <p className="text-xs text-muted-foreground">Artículos vectorizados para búsqueda semántica con IA.</p>
        </div>
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Nuevo artículo
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col">
            <SheetHeader>
              <SheetTitle>Nuevo artículo</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="kb-title">Título</Label>
                <Input id="kb-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Política de devoluciones" maxLength={200} />
                <p className="text-[10px] text-muted-foreground">{title.length}/200</p>
              </div>
              <Tabs value={sourceType} onValueChange={(v) => setSourceType(v as SourceType)}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="text">Texto plano</TabsTrigger>
                  <TabsTrigger value="markdown">Markdown</TabsTrigger>
                </TabsList>
                <TabsContent value="text" className="mt-3">
                  <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Pegá el contenido del artículo..." className="min-h-[300px] font-sans" maxLength={50000} />
                </TabsContent>
                <TabsContent value="markdown" className="mt-3">
                  <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="# Título&#10;&#10;Contenido en **markdown**..." className="min-h-[300px] font-mono text-sm" maxLength={50000} />
                </TabsContent>
              </Tabs>
              <p className="text-[10px] text-muted-foreground">{content.length}/50000 caracteres</p>
            </div>
            <div className="border-t border-border pt-4 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { resetForm(); setDrawerOpen(false); }} disabled={submitting}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creando...</> : 'Crear y procesar'}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Articles table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Artículos ({articles.length})</CardTitle>
            <CardDescription>Cada artículo se divide en chunks y se vectoriza con OpenAI.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Aún no creaste artículos. Empezá con "Nuevo artículo".
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead className="w-24">Tipo</TableHead>
                    <TableHead className="w-32">Estado</TableHead>
                    <TableHead className="w-32">Creado</TableHead>
                    <TableHead className="w-28 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articles.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{a.title}</div>
                        {a.status === 'error' && a.error_message && (
                          <div className="text-[11px] text-destructive mt-1 truncate max-w-md" title={a.error_message}>
                            {a.error_message}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{a.source_type}</Badge>
                      </TableCell>
                      <TableCell><StatusBadge status={a.status} /></TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {timeAgoEs(new Date(a.created_at))}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleReprocess(a)} title="Reprocesar">
                            <RefreshCw className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(a)} title="Borrar">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Search test */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Probar búsqueda semántica
            </CardTitle>
            <CardDescription>Ingresá una pregunta y buscá los chunks más relevantes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="¿Qué consulta querés buscar?" onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
              <Button onClick={handleSearch} disabled={searching} className="gap-2">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Buscar
              </Button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Cantidad de resultados: {matchCount}</Label>
              </div>
              <Slider value={[matchCount]} onValueChange={(v) => setMatchCount(v[0])} min={1} max={10} step={1} />
            </div>
            {searchResults.length > 0 && (
              <div className="space-y-2 pt-2">
                {searchResults.map((m) => (
                  <div key={m.chunk_id} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">{m.article_title}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {(m.similarity * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">{m.content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default KnowledgeBasePage;
