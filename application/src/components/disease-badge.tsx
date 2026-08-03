import { cn } from "@/lib/utils";

interface DiseaseBadgeProps {
  disease: string;
  probability: number;
  className?: string;
}

export function DiseaseBadge({ disease, probability, className }: DiseaseBadgeProps) {
  const isPositive = probability >= 0.5;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        isPositive ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800",
        className
      )}
    >
      {disease}
    </span>
  );
}
