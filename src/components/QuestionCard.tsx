import type { QuestionRow } from '@/types/question';
import CategoryBadge from './CategoryBadge';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';

interface Props {
  question: QuestionRow;
  isSelected: boolean;
  onClick: () => void;
}

const QuestionCard = ({ question, isSelected, onClick }: Props) => {
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
          {question.product_title ?? 'Producto'}
        </h4>
        <CategoryBadge category={question.ai_category} />
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{question.question_text}</p>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{question.buyer_id ?? 'Comprador'}</span>
        <span>{elapsed}</span>
      </div>
    </motion.button>
  );
};

export default QuestionCard;
