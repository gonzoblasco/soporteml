import type { QuestionRow } from '@/types/question';
import CategoryBadge from './CategoryBadge';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { AlertTriangle, ExternalLink } from 'lucide-react';

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
      className={`w-full text-left p-4 rounded-lg border transition-colors ${
        isSelected
          ? 'bg-accent border-primary/30 shadow-sm'
          : 'bg-card/40 border-border/50 hover:bg-accent/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="text-sm font-medium text-foreground line-clamp-1">
          {question.product_permalink ? (
            <a
              href={question.product_permalink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="hover:text-primary hover:underline inline-flex items-center gap-1"
            >
              {question.product_title ?? 'Producto'}
              <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
            </a>
          ) : (
            question.product_title ?? 'Producto'
          )}
        </h4>
        <CategoryBadge category={question.ai_category} />
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{question.question_text}</p>
      {showHumanReason && question.requires_human_reason && (
        <div className="flex items-start gap-1.5 mb-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
          <span className="line-clamp-1">{question.requires_human_reason}</span>
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{question.buyer_nickname ?? question.buyer_id ?? 'Comprador'}</span>
        <span>{elapsed}</span>
      </div>
    </motion.button>
  );
};

export default QuestionCard;
