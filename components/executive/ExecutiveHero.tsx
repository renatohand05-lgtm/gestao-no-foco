import { cn } from "@/lib/utils";
import { exAnimations } from "@/lib/design-system/animations";
import { exColors } from "@/lib/design-system/colors";
import { exPadding } from "@/lib/design-system/spacing";
import { exRadius } from "@/lib/design-system/radius";
import { exShadow } from "@/lib/design-system/shadow";
import { exTypography } from "@/lib/design-system/typography";

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

/**
 * Hero executivo premium (Sprint 10.3).
 */
export function ExecutiveHero({
  title,
  subtitle,
  eyebrow,
  actions,
  children,
  className,
}: Props) {
  return (
    <header
      className={cn(
        "relative overflow-hidden border border-border/40 bg-gradient-to-br from-card via-card to-blue-600/[0.06]",
        exRadius[20],
        exPadding[24],
        exShadow.elevated,
        exAnimations.fade,
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-blue-600/[0.06] blur-2xl"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-600/50 to-transparent" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          {eyebrow ? (
            <p className={cn(exTypography.label, exColors.primary.text)}>
              {eyebrow}
            </p>
          ) : null}
          <h1 className={exTypography.hero}>{title}</h1>
          {subtitle ? <p className={exTypography.subtitle}>{subtitle}</p> : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
      {children ? <div className="relative mt-6">{children}</div> : null}
    </header>
  );
}
