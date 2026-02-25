import { useState } from 'react';
import type { QuestionGroup } from '@/lib/groupQuestions';
import QuestionCard from './QuestionCard';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import CategoryBadge from './CategoryBadge';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  group: QuestionGroup;
  selectedId: string | null;
  onSelect: (id: string) => void;
  showHumanReason?: boolean;
}

const GroupedQuestionCard = ({ group, selectedId, onSelect, showHumanReason }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const count = group.questions.length;

  // Single question → render normal card
  if (count === 1) {
    const q = group.questions[0];
    return (
      <QuestionCard
        question={q}
        isSelected={selectedId === q.id}
        onClick={() => onSelect(q.id)}
        showHumanReason={showHumanReason}
      />
    );
  }

  const elapsed = formatDistanceToNow(new Date(group.latest_at), { addSuffix: true, locale: es });
  const isAnySelected = group.questions.some(q => q.id === selectedId);

  // Most common category
  const categories = group.questions.map(q => q.ai_category).filter(Boolean);
  const topCategory = categories.length > 0
    ? categories.sort((a, b) =>
        categories.filter(c => c === b).length - categories.filter(c => c === a).length
      )[0]
    : null;

  return (
    <div className="space-y-1">
      <motion.button
        layout
        onClick={() => setExpanded(prev => !prev)}
        className={`w-full text-left rounded-md border p-3 transition-colors ${
          isAnySelected
            ? 'bg-accent border-primary/30 shadow-sm'
            : 'bg-card border-border/30 hover:bg-accent/50'
        }`}
      >
        <div className="flex items-center gap-3">
          {topCategory && <CategoryBadge category={topCategory} />}
          <div className="flex-1 min-w-0">
            <span className="text-sm truncate block">
              {group.product_title ?? 'Producto'}
            </span>
            <span className="text-xs text-muted-foreground">
              {group.buyer_nickname ?? group.buyer_id ?? 'Comprador'} · {elapsed}
            </span>
          </div>
          <Badge variant="secondary" className="text-xs gap-1 font-normal shrink-0">
            <MessageSquare className="w-3 h-3" />
            {count}
          </Badge>
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          )}
        </div>
      </motion.button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="pl-3 border-l-2 border-primary/20 ml-2 space-y-1 overflow-hidden"
          >
            {group.questions.map(q => (
              <QuestionCard
                key={q.id}
                question={q}
                isSelected={selectedId === q.id}
                onClick={() => onSelect(q.id)}
                showHumanReason={showHumanReason}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GroupedQuestionCard;
