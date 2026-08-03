import { cn } from "@/lib/utils";

interface ProgressProps {
  value?: number;
  indeterminate?: boolean;
  className?: string;
  label?: string;
}

export function Progress({ value, indeterminate, className, label }: ProgressProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {label && <p className="text-sm font-medium text-slate-700">{label}</p>}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        {indeterminate ? (
          <div className="h-full w-1/3 animate-progress-indeterminate rounded-full bg-blue-600" />
        ) : (
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%` }}
          />
        )}
      </div>
    </div>
  );
}
