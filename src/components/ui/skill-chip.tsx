import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SkillChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** When provided, renders a remove button that calls this handler. */
  onRemove?: () => void;
}

const SkillChip = React.forwardRef<HTMLSpanElement, SkillChipProps>(
  ({ className, children, onRemove, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-1 text-caption font-medium text-primary whitespace-nowrap transition-default",
        onRemove && "group pr-1",
        className
      )}
      {...props}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-white transition-default"
          aria-label={`Remove ${typeof children === "string" ? children : "chip"}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )
);
SkillChip.displayName = "SkillChip";

export { SkillChip };
