import { cn } from "@/lib/utils";
import { gofMotion, gofSpaceY, gofTypography } from "@/lib/design-system/foundation";
import {
  gofCardHeader,
  gofCardPadding,
  gofCardSurface,
} from "@/lib/design-system/primitives";

type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Envolve conteúdo na superfície canônica de card */
  panel?: boolean;
};

/**
 * Seção executiva — hierarquia Title/Subtitle + stack (Gate 19.0.2).
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
        gofSpaceY.md,
        gofMotion.fade,
        panel && cn(gofCardSurface, gofCardPadding),
        "min-w-0",
        className,
      )}
      aria-label={title}
    >
      <div className={cn(gofCardHeader, !panel && "border-b-0 pb-0")}>
        <div className="min-w-0 space-y-1">
          <h2 className={cn(gofTypography.title, "truncate")}>{title}</h2>
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
      <div className="min-w-0">{children}</div>
    </section>
  );
}
