import { cn } from "@/lib/utils";
import { gofSpaceY } from "@/lib/design-system";

type Props = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Grid do workspace — ritmo adaptável (Gate 19.4.1).
 */
export function ExecutiveWorkspaceGrid({ children, className }: Props) {
  return (
    <div
      className={cn(
        "grid w-full min-w-0 grid-cols-1 gap-6 overflow-x-hidden lg:gap-8",
        gofSpaceY.lg,
        className,
      )}
    >
      {children}
    </div>
  );
}
