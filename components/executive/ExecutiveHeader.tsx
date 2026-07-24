import { cn } from "@/lib/utils";
import { gofMotion, gofTypography } from "@/lib/design-system/foundation";

type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

/**
 * Cabeçalho de módulo — tipografia canônica (Gate 19.0.2).
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
        gofMotion.fade,
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className={cn(gofTypography.title, "sm:text-2xl")}>{title}</h1>
        {description ? (
          <p className={cn(gofTypography.subtitle, "max-w-2xl break-words")}>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
