import { cn } from "@/lib/utils";
import {
  gofMotion,
  gofTypography,
} from "@/lib/design-system/foundation";
import { gofGrid, gofSurface } from "@/lib/design-system/layout";

type Props = {
  children: React.ReactNode;
  className?: string;
  label?: string;
  actions?: React.ReactNode;
};

/**
 * ExecutiveFilter — container de filtros (Gate 19.0.2).
 * Sem aplicar filtros / URL / services.
 */
export function ExecutiveFilter({
  children,
  className,
  label,
  actions,
}: Props) {
  return (
    <div
      className={cn(gofSurface.inset, "p-4", gofMotion.fade, className)}
      role="search"
      aria-label={label ?? "Filtros"}
    >
      {(label || actions) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {label ? (
            <p className={cn(gofTypography.caption, "font-semibold")}>{label}</p>
          ) : (
            <span />
          )}
          {actions}
        </div>
      )}
      <div className={gofGrid.filters}>{children}</div>
    </div>
  );
}

type FieldProps = {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
};

export function ExecutiveFilterField({
  label,
  htmlFor,
  children,
  className,
}: FieldProps) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("flex min-w-0 flex-col gap-1.5", className)}
    >
      <span className={gofTypography.caption}>{label}</span>
      {children}
    </label>
  );
}
