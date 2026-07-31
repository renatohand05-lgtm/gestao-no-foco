import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const toneClass: Record<Tone, string> = {
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/10 text-danger",
  info: "border-[var(--brand-gold)]/30 bg-[var(--brand-gold)]/10 text-[var(--brand-gold-deep)] dark:text-[var(--brand-gold-soft)]",
  neutral:
    "border-[var(--gf-border-subtle)] bg-[var(--gf-surface-interactive)] text-[var(--text-secondary)]",
};

type Props = {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
};

export function GFStatusPill({ children, tone = "neutral", className }: Props) {
  return (
    <span
      className={cn(
        "gf-status-pill inline-flex items-center rounded-md border px-2 py-0.5",
        "text-[10px] font-medium tracking-wide",
        toneClass[tone],
        className,
      )}
      data-gf-status-pill=""
      data-tone={tone}
    >
      {children}
    </span>
  );
}
