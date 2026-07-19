import { cn } from "@/lib/utils";
import { exAnimations } from "@/lib/design-system/animations";
import { exColors } from "@/lib/design-system/colors";
import { exPadding, exStack } from "@/lib/design-system/spacing";
import { exRadius } from "@/lib/design-system/radius";
import { exTypography } from "@/lib/design-system/typography";

type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Painel com fundo suave para identidade de seção */
  panel?: boolean;
};

/**
 * Seção executiva — título discreto; conteúdo protagoniza (Sprint 13.8).
 */
export function ExecutiveSection({
  title,
  description,
  actions,
  children,
  className,
  panel = false,
}: Props) {
  return (
    <section
      className={cn(
        exStack[16],
        exAnimations.fade,
        panel &&
          cn(
            exRadius[20],
            "border",
            exColors.neutral.border,
            exColors.neutral.surface,
            exPadding[16],
            "sm:p-6 lg:p-8",
          ),
        className,
      )}
      aria-label={title}
    >
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h2 className={exTypography.sectionTitle}>{title}</h2>
          {description ? (
            <p className={cn(exTypography.caption, "max-w-2xl")}>
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
}
