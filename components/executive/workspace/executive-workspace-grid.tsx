import { cn } from "@/lib/utils";
import { exStack } from "@/lib/design-system";

type Props = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Grid do workspace — ritmo adaptável notebook-first.
 */
export function ExecutiveWorkspaceGrid({ children, className }: Props) {
  return (
    <div
      className={cn(
        "grid w-full grid-cols-1 gap-6 lg:gap-8",
        exStack[24],
        className,
      )}
    >
      {children}
    </div>
  );
}
