import { cn } from "@/lib/utils";
import { exAnimations } from "@/lib/design-system/animations";
import { exTypography } from "@/lib/design-system/typography";

type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

/**
 * Cabeçalho de página/módulo executivo (mais compacto que o Hero).
 */
export function ExecutiveHeader({
  title,
  description,
  actions,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        exAnimations.fade,
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className={exTypography.title}>{title}</h1>
        {description ? (
          <p className={exTypography.subtitle}>{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
