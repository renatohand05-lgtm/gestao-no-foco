import { AlertCircle, CheckCircle2, Info } from "lucide-react";

import { cn } from "@/lib/utils";

type FeedbackMessageProps = {
  variant?: "error" | "success" | "info" | "warning";
  children: React.ReactNode;
  className?: string;
};

const VARIANT_STYLES = {
  error: "bg-destructive/10 text-destructive",
  success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  info: "bg-blue-500/10 text-blue-800 dark:text-blue-300",
  warning: "bg-amber-500/10 text-amber-900 dark:text-amber-300",
} as const;

const VARIANT_ICONS = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
  warning: AlertCircle,
} as const;

/**
 * Feedback inline padronizado (formulários).
 * Para feedback global/temporário use `useToast()`.
 */
export function FeedbackMessage({
  variant = "error",
  children,
  className,
}: FeedbackMessageProps) {
  const Icon = VARIANT_ICONS[variant];

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-lg px-3 py-2 text-sm",
        VARIANT_STYLES[variant],
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}
