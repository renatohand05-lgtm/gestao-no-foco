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
            actionsClassName,
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
