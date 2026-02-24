import { useState } from 'react';
import type { QuestionGroup } from '@/lib/groupQuestions';
import type { QuestionRow } from '@/types/question';
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
      {/* Collapsed header */}
      <motion.button
        layout
        onClick={() => setExpanded(prev => !prev)}
        className={`w-full text-left p-4 rounded-lg border transition-colors ${
          isAnySelected
            ? 'bg-accent border-primary/30 shadow-sm'
            : 'bg-card/40 border-border/50 hover:bg-accent/50'
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h4 className="text-sm font-medium text-foreground line-clamp-1">
            {group.product_title ?? 'Producto'}
          </h4>
          <div className="flex items-center gap-1.5 shrink-0">
            {topCategory && <CategoryBadge category={topCategory} />}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className="text-xs gap-1 font-normal">
            <MessageSquare className="w-3 h-3" />
            {count} {count === 1 ? 'mensaje pendiente' : 'mensajes pendientes'}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{group.buyer_nickname ?? group.buyer_id ?? 'Comprador'}</span>
          <div className="flex items-center gap-1.5">
            <span>{elapsed}</span>
            {expanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </div>
        </div>
      </motion.button>

      {/* Expanded children */}
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
