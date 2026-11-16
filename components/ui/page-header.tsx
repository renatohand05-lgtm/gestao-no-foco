import { dsGap, dsSpace, dsType } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  /** Classes for the actions slot (right/bottom area). */
  actionsClassName?: string;
};

export function PageHeader({
  title,
  description,
  children,
  className,
  actionsClassName,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center md:justify-between",
        dsGap.lg,
        className,
      )}
    >
      <div className={dsSpace.stackXs}>
        <h1 className={dsType.pageTitle}>{title}</h1>
        {description ? (
          <p className={dsType.descriptionLg}>{description}</p>
        ) : null}
      </div>
      {children ? (
        <div
          className={cn(
            "flex flex-wrap items-center",
            dsGap.sm,
            // Celular: uma faixa que desliza para o lado (em vez de 3 linhas de botões).
            "max-md:-mx-4 max-md:flex-nowrap max-md:overflow-x-auto max-md:px-4 max-md:pb-1 max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden max-md:[&>*]:shrink-0",
            actionsClassName,
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
