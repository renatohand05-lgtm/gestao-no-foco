import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";

import { GFIcon, type GfIconVariant } from "@/components/gf/gf-icon";
import { gfType } from "@/lib/design-system/signature";
import { cn } from "@/lib/utils";

type Severity = "info" | "warning" | "danger" | "success";

const severityToIcon: Record<Severity, GfIconVariant> = {
  info: "intelligence",
  warning: "warning",
  danger: "danger",
  success: "success",
};

/** Contraste legível light+dark — Sprint 26.2.1 */
const severityBorder: Record<Severity, string> = {
  info: "border-border bg-muted dark:border-[var(--brand-gold)]/35 dark:bg-[var(--brand-gold)]/12",
  warning:
    "border-warning/50 bg-[color-mix(in_oklab,var(--warning)_14%,var(--card))] dark:bg-warning/15",
  danger:
    "border-danger/50 bg-[color-mix(in_oklab,var(--danger)_12%,var(--card))] dark:bg-danger/15",
  success:
    "border-success/50 bg-[color-mix(in_oklab,var(--success)_12%,var(--card))] dark:bg-success/15",
};

type Props = {
  title: string;
  body: string;
  confianca: string;
  origem: string;
  href?: string;
  severity?: Severity;
  icon?: LucideIcon;
  className?: string;
};

export function GFInsightCard({
  title,
  body,
  confianca,
  origem,
  href,
  severity = "info",
  icon = Sparkles,
  className,
}: Props) {
  const content = (
    <div className="flex items-start gap-2.5">
      <GFIcon icon={icon} size="sm" variant={severityToIcon[severity]} />
      <div className="min-w-0 flex-1">
        <p className={cn(gfType.cardTitle, "text-[var(--text-primary)]")}>
          {title}
        </p>
        <p
          className={cn(
            "mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]",
          )}
        >
          {body}
        </p>
        <p className="mt-2 text-[10px] font-medium tracking-wide text-[var(--text-secondary)] uppercase">
          {confianca} · {origem}
        </p>
      </div>
    </div>
  );

  const shell = cn(
    "gf-insight-card block rounded-xl border p-2.5 transition-colors",
    "hover:border-[var(--gf-border-active)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40",
    severityBorder[severity],
    className,
  );

  if (href) {
    return (
      <Link href={href} className={shell} data-gf-insight-card="">
        {content}
      </Link>
    );
  }

  return (
    <article className={shell} data-gf-insight-card="">
      {content}
    </article>
  );
}
