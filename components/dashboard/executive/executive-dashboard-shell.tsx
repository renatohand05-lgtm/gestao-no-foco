import { cn } from "@/lib/utils";
import { exPaddingX, exSize, exStack } from "@/lib/design-system";

type Props = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Shell do Dashboard Executivo — ritmo notebook-first (Sprint 10.6).
 */
export function ExecutiveDashboardShell({ children, className }: Props) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        exSize.shell,
        exPaddingX[16],
        "sm:px-5 lg:px-8 xl:px-10",
        exStack[20],
        "pb-12 pt-0 lg:gap-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
