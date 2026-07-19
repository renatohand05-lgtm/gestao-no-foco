import { cn } from "@/lib/utils";
import { dsLayout, dsPadding } from "@/lib/design-system";

type PageContainerProps = {
  children: React.ReactNode;
  className?: string;
};

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <main className="flex-1 overflow-auto">
      <div className={cn(dsLayout.content, dsPadding.page, className)}>
        {children}
      </div>
    </main>
  );
}
