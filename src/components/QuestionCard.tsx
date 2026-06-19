import type { QuestionRow } from '@/types/question';
import CategoryBadge from './CategoryBadge';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock } from 'lucide-react';
import { derivePriorityChips } from '@/lib/priorityChips';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { timeAgoEs } from '@/lib/timeAgo';
import { computeSlaInfo } from '@/lib/sla';

interface Props {
  question: QuestionRow;
  isSelected: boolean;
  onClick: () => void;
  showHumanReason?: boolean;
  slaTargetMinutes?: number;
}

const QuestionCard = ({ question, isSelected, onClick, showHumanReason, slaTargetMinutes }: Props) => {
  const date = new Date(question.created_at);
  const elapsed = isNaN(date.getTime()) ? '' : timeAgoEs(question.created_at);
  const chips = showHumanReason ? derivePriorityChips(question) : [];

  // Show SLA chip only for pending/unanswered questions when target is provided
  const isPending = question.status === 'pending' && !question.answered_at;
  const slaInfo = slaTargetMinutes && isPending
    ? computeSlaInfo(question.created_at, slaTargetMinutes, question.answered_at)
    : null;
  const showSlaChip = slaInfo && (slaInfo.status === 'at_risk' || slaInfo.status === 'breached');

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
        {showSlaChip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border shrink-0 ${slaInfo!.chipClass}`}>
                <Clock className="w-2.5 h-2.5" />
                {slaInfo!.label}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs max-w-[240px]">
              {slaInfo!.tooltip}
            </TooltipContent>
          </Tooltip>
        )}
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
