"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const toastVariants = cva(
  "pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-md border p-4 shadow-md transition-all duration-200 ease-out data-[dismissed=true]:opacity-0 data-[dismissed=true]:translate-x-4",
  {
    variants: {
      variant: {
        default: "border-border bg-surface text-text-primary",
        success: "border-success/30 bg-success/5 text-text-primary",
        warning: "border-warning/30 bg-warning/5 text-text-primary",
        destructive: "border-danger/30 bg-danger/5 text-text-primary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  title?: string;
  description?: string;
  onDismiss?: () => void;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant, title, description, onDismiss, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(toastVariants({ variant, className }))}
        role="alert"
        {...props}
      >
        <div className="flex-1">
          {title && (
            <p className="text-body-sm font-semibold">{title}</p>
          )}
          {description && (
            <p className="mt-0.5 text-caption text-text-secondary">
              {description}
            </p>
          )}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-muted hover:text-text-primary transition-default"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }
);
Toast.displayName = "Toast";

export { Toast, toastVariants };
