import { brandConfig } from "@/config/brand";
import { cn } from "@/lib/utils";
import { gofMotion, gofRadius, gofTypography } from "@/lib/design-system";

type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

/**
 * Shell de primeiro acesso — identidade GESTÃO (Gate 19.4).
 */
export function OnboardingShell({
  title,
  description,
  children,
  footer,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:py-10",
        gofMotion.fade,
        className,
      )}
    >
      <header className="space-y-2">
        <p className="text-[10px] font-medium tracking-[0.16em] text-[var(--brand-gold)] uppercase">
          {brandConfig.name} · Primeiro acesso
        </p>
        <h1
          className={cn(
            "font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--brand-graphite)]",
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className={cn(gofTypography.subtitle, "max-w-2xl")}>
            {description}
          </p>
        ) : null}
      </header>

      <div
        className={cn(
          "border border-border/60 bg-[var(--brand-white)] p-5 sm:p-6",
          gofRadius.lg,
        )}
      >
        {children}
      </div>

      {footer ? <div className="flex flex-wrap gap-2">{footer}</div> : null}
    </div>
  );
}
