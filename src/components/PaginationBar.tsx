import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  page: number;
  totalPages: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  totalCount?: number;
  from?: number;
  to?: number;
}

export function PaginationBar({ page, totalPages, canPrev, canNext, onPrev, onNext, totalCount, from, to }: Props) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-3 py-2 border-t border-border text-xs text-muted-foreground">
      <span>
        {totalCount != null && from != null && to != null
          ? `${from + 1}–${Math.min(to + 1, totalCount)} de ${totalCount}`
          : `Página ${page + 1} de ${totalPages}`}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!canPrev} onClick={onPrev}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!canNext} onClick={onNext}>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
