import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const scoreBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-1 text-caption font-medium text-white whitespace-nowrap",
  {
    variants: {
      fit: {
        high: "bg-success",
        stretch: "bg-warning",
        low: "bg-danger",
      },
    },
    defaultVariants: {
      fit: "high",
    },
  }
);

export interface ScoreBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof scoreBadgeVariants> {
  /** The numeric score to display (0–100). */
  score?: number;
}

const ScoreBadge = React.forwardRef<HTMLSpanElement, ScoreBadgeProps>(
  ({ className, fit, score, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(scoreBadgeVariants({ fit, className }))}
      {...props}
    >
      {children ??
        (score !== undefined
          ? `${score}% ${fit === "high" ? "High Fit" : fit === "stretch" ? "Stretch" : "Low Fit"}`
          : fit === "high"
            ? "High Fit"
            : fit === "stretch"
              ? "Stretch"
              : "Low Fit")}
    </span>
  )
);
ScoreBadge.displayName = "ScoreBadge";

export { ScoreBadge, scoreBadgeVariants };
