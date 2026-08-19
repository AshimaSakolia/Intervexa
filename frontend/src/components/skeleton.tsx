export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-border ${className}`} />;
}

export function InterviewRowSkeleton() {
  return (
    <div className="w-full flex items-center justify-between gap-4 rounded-lg border border-border bg-paper-raised px-4 py-3">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Skeleton className="h-5 w-12" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  );
}
