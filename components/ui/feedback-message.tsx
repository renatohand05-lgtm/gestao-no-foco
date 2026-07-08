import { AlertCircle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

type FeedbackMessageProps = {
  variant?: "error" | "success";
  children: React.ReactNode;
  className?: string;
};

export function FeedbackMessage({
  variant = "error",
  children,
  className,
}: FeedbackMessageProps) {
  const Icon = variant === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-lg px-3 py-2 text-sm",
        variant === "error" && "bg-destructive/10 text-destructive",
        variant === "success" &&
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}
