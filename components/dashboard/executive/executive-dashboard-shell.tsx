import { cn } from "@/lib/utils";
import { exPaddingX, exStack } from "@/lib/design-system";

type Props = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Shell do Dashboard Executivo — largura enterprise para Full HD.
 */
export function ExecutiveDashboardShell({ children, className }: Props) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[96rem]",
        exPaddingX[16],
        "sm:px-5 lg:px-8 xl:px-10 2xl:px-12",
        exStack[24],
        "pb-12 pt-0 lg:gap-7",
        className,
      )}
    >
      {children}
    </div>
  );
}
