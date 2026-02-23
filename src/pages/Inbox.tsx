import { useState } from 'react';
import { mockQuestions } from '@/data/mockData';
import QuestionCard from '@/components/QuestionCard';
import QuestionDetail from '@/components/QuestionDetail';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const Inbox = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = mockQuestions.filter(
    (q) =>
      q.productName.toLowerCase().includes(search.toLowerCase()) ||
      q.buyerName.toLowerCase().includes(search.toLowerCase()) ||
      q.category.toLowerCase().includes(search.toLowerCase())
  );

  const selected = mockQuestions.find((q) => q.id === selectedId) ?? null;

  return (
    <div className="flex h-screen">
      {/* Left Column — Question List */}
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
          {filtered.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              isSelected={selectedId === q.id}
              onClick={() => setSelectedId(q.id)}
            />
          ))}
        </div>
      </div>

      {/* Right Column — Detail */}
      <QuestionDetail question={selected} />
    </div>
  );
};

export default Inbox;
