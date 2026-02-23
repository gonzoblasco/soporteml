import type { QuestionWithProduct } from '@/pages/Inbox';
import CategoryBadge from './CategoryBadge';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';

interface Props {
  question: QuestionWithProduct;
  isSelected: boolean;
  onClick: () => void;
}

const QuestionCard = ({ question, isSelected, onClick }: Props) => {
  const elapsed = formatDistanceToNow(new Date(question.created_at), { addSuffix: true, locale: es });

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
        <h4 className="text-sm font-medium text-foreground line-clamp-1">{question.products.name}</h4>
        <CategoryBadge category={question.category} />
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{question.question_text}</p>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{question.buyer_name}</span>
        <span>{elapsed}</span>
      </div>
    </motion.button>
  );
};

export default QuestionCard;
