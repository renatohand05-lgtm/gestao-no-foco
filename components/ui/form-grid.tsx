import { cn } from "@/lib/utils";

type FormGridProps = {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
};

const columnClassName: Record<NonNullable<FormGridProps["columns"]>, string> = {
  1: "grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export function FormGrid({
  children,
  columns = 2,
  className,
}: FormGridProps) {
  return (
    <div className={cn("grid gap-4", columnClassName[columns], className)}>
      {children}
    </div>
  );
}
