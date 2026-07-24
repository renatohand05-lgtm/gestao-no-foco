import { cn } from "@/lib/utils";
import { gofMotion, gofTypography } from "@/lib/design-system/foundation";
import {
  gofCardFooter,
  gofCardHeader,
  gofCardPadding,
  gofCardSurface,
} from "@/lib/design-system/primitives";

type Props = {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
};

/**
 * ExecutivePanel — mesmo contrato visual do ExecutiveCard (Gate 19.0.2).
 */
export function ExecutivePanel({
  children,
  className,
  elevated = false,
  header,
  footer,
}: Props) {
  return (
    <div
      className={cn(
        gofCardSurface,
        gofCardPadding,
        elevated && "shadow-md",
        gofMotion.fade,
        "min-w-0 overflow-hidden",
        className,
      )}
    >
      {header}
      {children}
      {footer}
    </div>
  );
}

type HeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function ExecutivePanelHeader({
  title,
  description,
  actions,
  className,
}: HeaderProps) {
  return (
    <div className={cn(gofCardHeader, "mb-4", className)}>
      <div className="min-w-0 space-y-1">
        <h3 className={cn(gofTypography.title, "truncate")}>{title}</h3>
        {description ? (
          <p className={cn(gofTypography.subtitle, "max-w-2xl break-words")}>
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

type FooterProps = {
  children: React.ReactNode;
  className?: string;
};

export function ExecutivePanelFooter({ children, className }: FooterProps) {
  return <div className={cn(gofCardFooter, className)}>{children}</div>;
}
