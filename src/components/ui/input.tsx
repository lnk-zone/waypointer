import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** When true, applies the error border and aria-invalid attribute. */
  error?: boolean;
  /** Error message displayed below the input. */
  errorMessage?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, errorMessage, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          aria-invalid={error || undefined}
          className={cn(
            "flex h-10 w-full rounded-sm border bg-surface px-3 text-body text-text-primary transition-default placeholder:text-muted focus:border-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
            error
              ? "border-danger focus:border-danger"
              : "border-border focus:border-primary",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && errorMessage && (
          <p className="mt-1 text-caption text-danger">{errorMessage}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
