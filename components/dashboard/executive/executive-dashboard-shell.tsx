import { cn } from "@/lib/utils";
import { exStack } from "@/lib/design-system";

type Props = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Shell do Dashboard Executivo — largura útil 1600–1760px (Sprint 25.6.1).
 * Sidebar fica fora desta largura (layout app).
 */
export function ExecutiveDashboardShell({ children, className }: Props) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full",
        "max-w-[var(--dashboard-max-width)]",
        "px-[var(--dashboard-gutter)]",
        "sm:px-5 lg:px-8 xl:px-10",
        exStack[24],
        "pb-12 pt-0 lg:gap-7",
        className,
      )}
      data-dashboard-premium=""
      data-dashboard-layout="shell"
    >
      <div
        className="pointer-events-none absolute inset-x-0 -top-8 h-48 bg-[radial-gradient(ellipse_at_top,rgba(201,168,76,0.10),transparent_70%)]"
        aria-hidden
      />
      <div className="relative space-y-6 lg:space-y-7">{children}</div>
    </div>
  );
}
