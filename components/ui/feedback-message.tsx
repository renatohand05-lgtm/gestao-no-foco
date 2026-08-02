import { AlertCircle, CheckCircle2, Info } from "lucide-react";

import { FEEDBACK_INLINE } from "@/components/ui/feedback-tones";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type FeedbackMessageProps = {
  variant?: "error" | "success" | "info" | "warning";
  children: React.ReactNode;
  className?: string;
};

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
        "flex items-start gap-2 rounded-lg px-3 py-2",
        gofTypography.caption,
        FEEDBACK_INLINE[variant],
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>{children}</p>
    </div>
  );
}
