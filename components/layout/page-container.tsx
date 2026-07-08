import { cn } from "@/lib/utils";

type PageContainerProps = {
  children: React.ReactNode;
  className?: string;
};

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <main className="flex-1 overflow-auto">
      <div
        className={cn(
          "mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8",
          className,
        )}
      >
        {children}
      </div>
    </main>
  );
}
