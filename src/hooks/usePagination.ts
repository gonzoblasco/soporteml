import { useState, useCallback, useMemo } from 'react';

const DEFAULT_PAGE_SIZE = 50;

export function usePagination(totalCount: number, pageSize = DEFAULT_PAGE_SIZE) {
  // Validate inputs
  const validTotalCount = Math.max(0, totalCount);
  const validPageSize = Math.max(1, pageSize);

  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(validTotalCount / validPageSize));
  const from = page * validPageSize;
  const to = from + validPageSize - 1;

  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  const goNext = useCallback(() => setPage((p) => Math.min(p + 1, totalPages - 1)), [totalPages]);
  const goPrev = useCallback(() => setPage((p) => Math.max(p - 1, 0)), []);
  const goTo = useCallback((p: number) => setPage(Math.max(0, Math.min(p, totalPages - 1))), [totalPages]);
  const reset = useCallback(() => setPage(0), []);

  return useMemo(
    () => ({ page, totalPages, from, to, canPrev, canNext, goNext, goPrev, goTo, reset, pageSize: validPageSize }),
    [page, totalPages, from, to, canPrev, canNext, goNext, goPrev, goTo, reset, validPageSize]
  );
}
