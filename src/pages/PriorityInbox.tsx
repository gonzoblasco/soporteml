import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { QuestionRow } from '@/types/question';
import QuestionCard from '@/components/QuestionCard';
import QuestionDetail from '@/components/QuestionDetail';
import { Search, Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

const PriorityInbox = () => {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const isMobile = useIsMobile();

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('questions')
      .select('*, products(title, meli_item_id, permalink)')
      .eq('requires_human', true)
      .in('status', ['pending'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      const mapped: QuestionRow[] = data.map((q: any) => ({
        ...q,
        product_title: q.products?.title ?? null,
        product_meli_id: q.products?.meli_item_id ?? null,
        product_permalink: q.products?.permalink ?? null,
      }));
      setQuestions(mapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    setSelectedId(null);
    fetchQuestions();
  }, [fetchQuestions]);

  const filtered = questions.filter(
    (q) =>
      (q.product_title ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (q.buyer_id ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (q.ai_category ?? '').toLowerCase().includes(search.toLowerCase()) ||
      q.question_text.toLowerCase().includes(search.toLowerCase())
  );

  const selected = questions.find((q) => q.id === selectedId) ?? null;

  const showDetail = isMobile && selectedId;
  const showList = !isMobile || !selectedId;

  return (
    <div className="flex h-full">
      {showList && (
        <div className={`${isMobile ? 'w-full' : 'w-96 shrink-0'} border-r border-border/50 flex flex-col`}>
          <div className="h-14 flex items-center justify-between px-4 border-b border-border/50">
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 text-amber-500 mr-2" />
              <h1 className="text-sm font-semibold text-foreground mr-3">Priority Inbox</h1>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                {filtered.length}
              </span>
            </div>
          </div>

          <div className="px-4 py-2 border-b border-border/50">
            <p className="text-xs text-muted-foreground">
              Consultas que la IA identificó como necesarias de revisión humana.
            </p>
          </div>

          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar preguntas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-muted/30 border-border/50 h-9 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <AlertTriangle className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">No hay consultas prioritarias pendientes</p>
              </div>
            ) : (
              filtered.map((q) => (
                <QuestionCard
                  key={q.id}
                  question={q}
                  isSelected={selectedId === q.id}
                  onClick={() => setSelectedId(q.id)}
                  showHumanReason
                />
              ))
            )}
          </div>
        </div>
      )}

      {isMobile && showDetail ? (
        <div className="w-full flex flex-col">
          <div className="h-14 flex items-center px-4 border-b border-border/50">
            <Button variant="ghost" size="icon" onClick={() => setSelectedId(null)} className="h-8 w-8 mr-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-foreground">Detalle</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <QuestionDetail
              question={selected}
              onUpdated={() => {
                setSelectedId(null);
                fetchQuestions();
              }}
            />
          </div>
        </div>
      ) : !isMobile ? (
        <QuestionDetail
          question={selected}
          onUpdated={() => {
            setSelectedId(null);
            fetchQuestions();
          }}
        />
      ) : null}
    </div>
  );
};

export default PriorityInbox;
