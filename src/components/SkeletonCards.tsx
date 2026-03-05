import { Skeleton } from '@/components/ui/skeleton';

/** Dashboard KPI skeleton row */
export const KpiSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    {[0, 1, 2].map((i) => (
      <div key={i} className="text-center p-4 rounded-lg bg-muted/50 border border-border/30 space-y-2">
        <Skeleton className="w-4 h-4 mx-auto rounded" />
        <Skeleton className="h-7 w-12 mx-auto rounded" />
        <Skeleton className="h-3 w-20 mx-auto rounded" />
      </div>
    ))}
  </div>
);

/** Question list skeleton */
export const QuestionListSkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="space-y-1.5">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-md border border-border/30 p-3 space-y-2">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-14 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

/** Dashboard chart card skeleton */
export const ChartCardSkeleton = () => (
  <div className="rounded-xl border border-border/50 bg-card/60 p-4 space-y-3">
    <Skeleton className="h-4 w-32 rounded" />
    <Skeleton className="h-48 w-full rounded-lg" />
  </div>
);

/** Product list skeleton */
export const ProductListSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="space-y-1">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-3 py-2.5">
        <Skeleton className="h-4 w-4 rounded shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-3/4 rounded" />
          <Skeleton className="h-3 w-1/3 rounded" />
        </div>
      </div>
    ))}
  </div>
);
