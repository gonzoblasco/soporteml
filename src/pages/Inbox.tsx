import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import QuestionCard from '@/components/QuestionCard';
import QuestionDetail from '@/components/QuestionDetail';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { Tables } from '@/integrations/supabase/types';

export type QuestionWithProduct = Tables<'questions'> & {
  products: Tables<'products'>;
};

const Inbox = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*, products(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as QuestionWithProduct[];
    },
  });

  const updateQuestion = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'answered' | 'discarded' }) => {
      const { error } = await supabase
        .from('questions')
        .update({
          status,
          answered_at: status === 'answered' ? new Date().toISOString() : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      setSelectedId(null);
    },
  });

  const filtered = questions.filter(
    (q) =>
      q.products.name.toLowerCase().includes(search.toLowerCase()) ||
      q.buyer_name.toLowerCase().includes(search.toLowerCase()) ||
      q.category.toLowerCase().includes(search.toLowerCase())
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
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No hay preguntas pendientes</p>
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
        onPublish={(id) => updateQuestion.mutate({ id, status: 'answered' })}
        onDiscard={(id) => updateQuestion.mutate({ id, status: 'discarded' })}
        isUpdating={updateQuestion.isPending}
      />
    </div>
  );
};

export default Inbox;
