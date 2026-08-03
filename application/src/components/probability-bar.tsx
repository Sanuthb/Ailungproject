import { cn } from "@/lib/utils";

interface ProbabilityBarProps {
  label: string;
  value: number;
  threshold?: number;
  className?: string;
}

export function ProbabilityBar({ label, value, threshold = 0.5, className }: ProbabilityBarProps) {
  const percentage = Math.round(value * 100);
  const isAboveThreshold = value >= threshold;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className={cn("font-semibold", isAboveThreshold ? "text-red-600" : "text-green-600")}>
          {percentage}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isAboveThreshold ? "bg-red-500" : "bg-green-500"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
