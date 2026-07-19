import { formatCurrency, formatPercent } from "@/lib/dashboard/format";
import { exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string;
  hint?: string;
  className?: string;
};

export function ScenarioMetric({ label, value, hint, className }: Props) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className={exTypography.label}>{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums tracking-tight sm:text-base">
        {value}
      </p>
      {hint ? (
        <p className={cn("mt-0.5", exTypography.caption)}>{hint}</p>
      ) : null}
    </div>
  );
}

export function formatScenarioMoney(value: number): string {
  return formatCurrency(value);
}

export function formatScenarioPct(value: number | null): string {
  if (value === null) return "—";
  return formatPercent(value);
}

export function formatScenarioSignedMoney(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatCurrency(value)}`;
}
