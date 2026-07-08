import { cn } from "@/lib/utils";

type DataTableToolbarProps = {
  children: React.ReactNode;
  className?: string;
};

export function DataTableToolbar({
  children,
  className,
}: DataTableToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
}
