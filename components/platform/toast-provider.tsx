"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

import { FEEDBACK_SURFACE } from "@/components/ui/feedback-tones";
import { gofFocusRing, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "info" | "warning";

export type ToastInput = {
  title?: string;
  description: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastItem = ToastInput & { id: string };

type ToastContextValue = {
  notify: (input: ToastInput | string) => void;
  success: (description: string, title?: string) => void;
  error: (description: string, title?: string) => void;
  info: (description: string, title?: string) => void;
  warning: (description: string, title?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertCircle,
} as const;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback((input: ToastInput | string) => {
    const payload: ToastInput =
      typeof input === "string" ? { description: input } : input;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const item: ToastItem = {
      id,
      variant: payload.variant ?? "info",
      durationMs: payload.durationMs ?? 4500,
      title: payload.title,
      description: payload.description,
    };
    setToasts((prev) => [...prev.slice(-4), item]);
  }, []);

  const api = useMemo<ToastContextValue>(
    () => ({
      notify,
      success: (description, title) =>
        notify({ description, title, variant: "success" }),
      error: (description, title) =>
        notify({ description, title, variant: "error" }),
      info: (description, title) =>
        notify({ description, title, variant: "info" }),
      warning: (description, title) =>
        notify({ description, title, variant: "warning" }),
    }),
    [notify],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const variant = toast.variant ?? "info";
  const Icon = ICONS[variant];

  useEffect(() => {
    const ms = toast.durationMs ?? 4500;
    const t = window.setTimeout(() => onDismiss(toast.id), ms);
    return () => window.clearTimeout(t);
  }, [toast.id, toast.durationMs, onDismiss]);

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-3 py-2.5 shadow-lg backdrop-blur",
        gofTypography.caption,
        FEEDBACK_SURFACE[variant],
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {toast.title ? (
          <p className="font-medium text-foreground">{toast.title}</p>
        ) : null}
        <p className={cn(toast.title && "mt-0.5 opacity-90")}>{toast.description}</p>
      </div>
      <button
        type="button"
        className={cn(
          "rounded-md p-1 opacity-70 transition hover:opacity-100",
          gofFocusRing,
        )}
        aria-label="Fechar notificação"
        onClick={() => onDismiss(toast.id)}
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast deve ser usado dentro de ToastProvider.");
  }
  return ctx;
}

/** Hook seguro para formulários — não quebra se provider ausente. */
export function useOptionalToast() {
  return useContext(ToastContext);
}

export function useGlobalPending() {
  const [pending, start] = useTransition();
  return { pending, startTransition: start };
}
