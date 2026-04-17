import type { QuestionRow } from '@/types/question';
import CategoryBadge from './CategoryBadge';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { derivePriorityChips } from '@/lib/priorityChips';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const timeAgoEs = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
};

interface Props {
  question: QuestionRow;
  isSelected: boolean;
  onClick: () => void;
  showHumanReason?: boolean;
}

const QuestionCard = ({ question, isSelected, onClick, showHumanReason }: Props) => {
  const date = new Date(question.created_at);
  const elapsed = isNaN(date.getTime()) ? '' : timeAgoEs(question.created_at);
  const chips = showHumanReason ? derivePriorityChips(question) : [];

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

      {showHumanReason && chips.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {chips.map(chip => (
            <span
              key={chip.label}
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${chip.color}`}
            >
              {chip.label}
            </span>
          ))}
          {question.requires_human_reason && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center text-muted-foreground cursor-help">
                  <AlertTriangle className="w-3 h-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-[240px]">
                {question.requires_human_reason}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
    </motion.button>
  );
};

export default QuestionCard;
