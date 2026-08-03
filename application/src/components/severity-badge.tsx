import { cn } from "@/lib/utils";
import { getSeverity } from "@/utils/disease";

export { getSeverity };

interface SeverityBadgeProps {
  severity: "Normal" | "Mild" | "Moderate" | "Severe";
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        {
          "bg-green-100 text-green-800": severity === "Normal",
          "bg-yellow-100 text-yellow-800": severity === "Mild",
          "bg-orange-100 text-orange-800": severity === "Moderate",
          "bg-red-100 text-red-800": severity === "Severe",
        },
        className
      )}
    >
      {severity}
    </span>
  );
}
