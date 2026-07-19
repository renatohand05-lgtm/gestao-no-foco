import { cn } from "@/lib/utils";
import { exAnimations, exRadius, exShadow, exTypography } from "@/lib/design-system";

type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

/**
 * Shell de primeira sessão / checklist (Sprint 13.12).
 */
export function OnboardingShell({
  title,
  description,
  children,
  footer,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:py-10",
        exAnimations.fade,
        className,
      )}
    >
      <header className="space-y-2">
        <p className={exTypography.label}>Primeiro valor</p>
        <h1 className={exTypography.headline}>{title}</h1>
        {description ? (
          <p className={cn(exTypography.body, "text-muted-foreground")}>
            {description}
          </p>
        ) : null}
      </header>

      <div
        className={cn(
          "border bg-white p-5 sm:p-6 dark:bg-card",
          exRadius[20],
          exShadow.card,
        )}
      >
        {children}
      </div>

      {footer ? <div className="flex flex-wrap gap-2">{footer}</div> : null}
    </div>
  );
}
