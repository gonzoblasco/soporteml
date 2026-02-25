import type { QuestionRow } from '@/types/question';
import CategoryBadge from './CategoryBadge';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface Props {
  question: QuestionRow;
  isSelected: boolean;
  onClick: () => void;
  showHumanReason?: boolean;
}

const QuestionCard = ({ question, isSelected, onClick, showHumanReason }: Props) => {
  const date = new Date(question.created_at);
  const elapsed = isNaN(date.getTime()) ? '' : formatDistanceToNow(date, { addSuffix: true, locale: es });

  return (
    <motion.button
      layout
      onClick={onClick}
      className={`w-full text-left rounded-md border p-3 transition-colors ${
        isSelected
          ? 'bg-accent border-primary/30 shadow-sm'
          : 'bg-card border-border/30 hover:bg-accent/50'
      }`}
    >
      <div className="flex items-center gap-3">
        <CategoryBadge category={question.ai_category} />
        <div className="flex-1 min-w-0">
          <span className="text-sm truncate block">{question.question_text}</span>
          <span className="text-xs text-muted-foreground">
            {question.buyer_nickname ?? question.buyer_id ?? 'Comprador'} · {elapsed}
          </span>
        </div>
      </div>

      {showHumanReason && question.requires_human_reason && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span className="truncate">{question.requires_human_reason}</span>
        </div>
      )}
    </motion.button>
  );
};

export default QuestionCard;
