import { cn } from "@/lib/utils";
import {
  gofContainer,
  gofMotion,
  gofSpaceY,
  gofStack,
} from "@/lib/design-system";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Largura do container */
  width?: "page" | "wide" | "full";
  /** Espaçamento vertical entre blocos */
  spacing?: "default" | "loose" | "tight";
};

const widthMap = {
  page: gofContainer.page,
  wide: gofContainer.wide,
  full: gofContainer.full,
} as const;

const spacingMap = {
  tight: gofStack.tight,
  default: gofSpaceY.md,
  loose: gofSpaceY.lg,
} as const;

/**
 * Página executiva — shell de layout Enterprise (Gate 19.1).
 * Sem lógica de negócio.
 */
export function ExecutivePage({
  children,
  className,
  width = "wide",
  spacing = "loose",
}: Props) {
  return (
    <div
      className={cn(
        widthMap[width],
        spacingMap[spacing],
        gofMotion.fade,
        "min-w-0 py-4 sm:py-6",
        className,
      )}
      data-executive-page=""
    >
      {children}
    </div>
  );
}
