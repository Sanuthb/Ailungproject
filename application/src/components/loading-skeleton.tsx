import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
}

// Deterministic varied widths so skeleton rows don't render as a uniform grid.
const LINE_WIDTHS = [92, 76, 88, 65, 95, 72, 84, 68];

export function LoadingSkeleton({ lines = 3, className }: LoadingSkeletonProps) {
  return (
    <div className={cn("animate-pulse space-y-3", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-4 rounded bg-slate-200"
          style={{ width: `${LINE_WIDTHS[index % LINE_WIDTHS.length]}%` }}
        />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-24 rounded bg-slate-200" />
          <div className="h-8 w-16 rounded bg-slate-200" />
        </div>
        <div className="h-12 w-12 rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 rounded bg-slate-200" />
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-14 rounded bg-slate-100" />
      ))}
    </div>
  );
}
