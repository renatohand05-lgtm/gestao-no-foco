import { cn } from "@/lib/utils";
import { gofTypography } from "@/lib/design-system";

type Props = {
  title: string;
  description: string;
  children?: React.ReactNode;
  optional?: boolean;
};

export function OnboardingStep({
  title,
  description,
  children,
  optional,
}: Props) {
  return (
    <section className="space-y-4" aria-labelledby="onboarding-step-title">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="onboarding-step-title" className={gofTypography.title}>
            {title}
          </h2>
          {optional ? (
            <span className={cn(gofTypography.caption, "text-muted-foreground")}>
              Opcional
            </span>
          ) : null}
        </div>
        <p className={gofTypography.subtitle}>{description}</p>
      </div>
      {children}
    </section>
  );
}
