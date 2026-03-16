import * as React from "react";

const TOAST_LIMIT = 5;
const TOAST_DISMISS_DURATION = 5000;
const DISMISS_ANIMATION_MS = 300;

type ToastVariant = "default" | "success" | "warning" | "destructive";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  /** Internal flag — set when a toast is animating out. */
  dismissed?: boolean;
}

type ToastAction =
  | { type: "ADD"; toast: Toast }
  | { type: "DISMISS"; id: string }
  | { type: "REMOVE"; id: string };

interface ToastState {
  toasts: Toast[];
}

function reducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case "ADD":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };
    case "DISMISS":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.id ? { ...t, dismissed: true } : t
        ),
      };
    case "REMOVE":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      };
    default:
      return state;
  }
}

// Global listeners pattern so toast() can be called from anywhere
const listeners: Array<(state: ToastState) => void> = [];
let memoryState: ToastState = { toasts: [] };

/** Tracks auto-dismiss timers so they can be cleared on manual dismiss. */
const dismissTimers = new Map<string, ReturnType<typeof setTimeout>>();

function globalDispatch(action: ToastAction) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => listener(memoryState));
}

let toastCount = 0;

function genId(): string {
  toastCount = (toastCount + 1) % Number.MAX_SAFE_INTEGER;
  return toastCount.toString();
}

/**
 * Dismiss a toast: triggers the exit animation, then removes from state.
 */
function dismissToast(id: string) {
  // Clear any pending auto-dismiss timer
  const timer = dismissTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    dismissTimers.delete(id);
  }

  globalDispatch({ type: "DISMISS", id });
  setTimeout(() => globalDispatch({ type: "REMOVE", id }), DISMISS_ANIMATION_MS);
}

/**
 * Show a toast notification. Can be called from any module — does not
 * require being inside a React component tree.
 */
export function toast(props: Omit<Toast, "id">): string {
  const id = genId();
  const duration = props.duration ?? TOAST_DISMISS_DURATION;

  globalDispatch({ type: "ADD", toast: { ...props, id } });

  // Schedule auto-dismiss
  const timer = setTimeout(() => {
    dismissTimers.delete(id);
    dismissToast(id);
  }, duration);
  dismissTimers.set(id, timer);

  return id;
}

toast.success = (props: Omit<Toast, "id" | "variant">) =>
  toast({ ...props, variant: "success" });
toast.warning = (props: Omit<Toast, "id" | "variant">) =>
  toast({ ...props, variant: "warning" });
toast.error = (props: Omit<Toast, "id" | "variant">) =>
  toast({ ...props, variant: "destructive" });

/**
 * React hook that subscribes to the global toast state.
 */
export function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: dismissToast,
  };
}
