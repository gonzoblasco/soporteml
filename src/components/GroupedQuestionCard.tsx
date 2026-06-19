import { useState } from 'react';
import type { QuestionGroup } from '@/lib/groupQuestions';
import QuestionCard from './QuestionCard';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, MessageSquare, Clock } from 'lucide-react';
import CategoryBadge from './CategoryBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { timeAgoEs } from '@/lib/timeAgo';
import { computeSlaInfo } from '@/lib/sla';

interface Props {
  group: QuestionGroup;
  selectedId: string | null;
  onSelect: (id: string) => void;
  showHumanReason?: boolean;
  slaTargetMinutes?: number;
}

const GroupedQuestionCard = ({ group, selectedId, onSelect, showHumanReason, slaTargetMinutes }: Props) => {
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
        slaTargetMinutes={slaTargetMinutes}
      />
    );
  }

  const elapsed = timeAgoEs(group.latest_at);
  const isAnySelected = group.questions.some(q => q.id === selectedId);

  // Most common category
  const categories = group.questions.map(q => q.ai_category).filter(Boolean);
  const topCategory = categories.length > 0
    ? categories.sort((a, b) =>
        categories.filter(c => c === b).length - categories.filter(c => c === a).length
      )[0]
    : null;

  // Worst SLA across pending questions in the group
  const groupSla = slaTargetMinutes
    ? group.questions
        .filter(q => q.status === 'pending' && !q.answered_at)
        .map(q => computeSlaInfo(q.created_at, slaTargetMinutes, q.answered_at))
        .sort((a, b) => a.remainingMin - b.remainingMin)[0]
    : null;
  const showSlaChip = groupSla && (groupSla.status === 'at_risk' || groupSla.status === 'breached');

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
          {showSlaChip && (
            <span
              title={groupSla!.tooltip}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0 ${groupSla!.chipClass}`}
            >
              <Clock className="w-2.5 h-2.5" />
              {groupSla!.label}
            </span>
          )}
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
                slaTargetMinutes={slaTargetMinutes}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GroupedQuestionCard;
