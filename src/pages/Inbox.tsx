import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { QuestionRow } from '@/types/question';
import QuestionCard from '@/components/QuestionCard';
import QuestionDetail from '@/components/QuestionDetail';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

const Inbox = () => {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('questions')
      .select('*, products(title, meli_item_id)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const mapped: QuestionRow[] = data.map((q: any) => ({
        ...q,
        product_title: q.products?.title ?? null,
        product_meli_id: q.products?.meli_item_id ?? null,
      }));
      setQuestions(mapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
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

  return (
    <div className="flex h-screen">
      {/* Left Column */}
      <div className="w-96 border-r border-border/50 flex flex-col shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-border/50">
          <h1 className="text-sm font-semibold text-foreground mr-3">Inbox</h1>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
            {filtered.length} pendientes
          </span>
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
            <p className="text-sm text-muted-foreground text-center py-12">No hay preguntas pendientes</p>
          ) : (
            filtered.map((q) => (
              <QuestionCard
                key={q.id}
                question={q}
                isSelected={selectedId === q.id}
                onClick={() => setSelectedId(q.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right Column */}
      <QuestionDetail
        question={selected}
        onUpdated={() => {
          setSelectedId(null);
          fetchQuestions();
        }}
      />
    </div>
  );
};

export default Inbox;
