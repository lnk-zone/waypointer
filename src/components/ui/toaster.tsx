"use client";

import { useToast } from "@/components/ui/use-toast";
import { Toast } from "@/components/ui/toast";

/**
 * Renders active toasts in the top-right corner.
 * Mount once in the root layout or Providers component.
 */
export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <Toast
          key={t.id}
          variant={t.variant}
          title={t.title}
          description={t.description}
          onDismiss={() => dismiss(t.id)}
          data-dismissed={t.dismissed || undefined}
        />
      ))}
    </div>
  );
}
