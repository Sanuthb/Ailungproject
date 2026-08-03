import { cn } from "@/lib/utils";
import { forwardRef, type LabelHTMLAttributes } from "react";

type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

const Label = forwardRef<HTMLLabelElement, LabelProps>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn("mb-1 block text-sm font-medium text-slate-700", className)}
    {...props}
  />
));
Label.displayName = "Label";

export { Label };
