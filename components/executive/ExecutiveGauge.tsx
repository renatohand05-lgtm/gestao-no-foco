import { cn } from "@/lib/utils";
import { exAnimations } from "@/lib/design-system/animations";
import { exColors, type ExColorTone } from "@/lib/design-system/colors";
import { exTypography } from "@/lib/design-system/typography";

type Props = {
  /** Percentual 0–100+ (cap visual em 100 para o arco) */
  value: number;
  label?: string;
  statusLabel?: string;
  tone?: Exclude<ExColorTone, "neutral">;
  className?: string;
  size?: number;
  /** Superfície escura (Hero) — traço e tipografia invertidos */
  inverse?: boolean;
  /** Sufixo do valor (default "%") */
  suffix?: string;
};

function strokeColor(tone: Exclude<ExColorTone, "neutral">) {
  switch (tone) {
    case "success":
      return "stroke-emerald-600";
    case "warning":
      return "stroke-orange-600";
    case "danger":
      return "stroke-red-600";
    case "info":
      return "stroke-violet-600";
    default:
      return "stroke-blue-600";
  }
}

/**
 * Gauge SVG leve de atingimento (Sprint 10.3).
 * Complementar ao valor textual — não substitui o número.
 */
export function ExecutiveGauge({
  value,
  label = "Atingimento",
  statusLabel,
  tone = "primary",
  className,
  size = 128,
  inverse = false,
  suffix = "%",
}: Props) {
  const pct = Math.min(Math.max(value, 0), 100);
  const radius = 42;
  const circumference = Math.PI * radius; // semicírculo
  const offset = circumference - (pct / 100) * circumference;
  const display = `${Math.round(pct)}${suffix}`;

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5",
        exAnimations.scale,
        className,
      )}
      role="img"
      aria-label={`${label}: ${display}${statusLabel ? ` — ${statusLabel}` : ""}`}
    >
      <svg
        width={size}
        height={size * 0.62}
        viewBox="0 0 100 62"
        className="overflow-visible"
        aria-hidden
      >
        <path
          d="M 8 54 A 42 42 0 0 1 92 54"
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          className={inverse ? "stroke-white/15" : "stroke-muted/60"}
        />
        <path
          d="M 8 54 A 42 42 0 0 1 92 54"
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          className={cn(
            inverse ? "stroke-sky-300" : strokeColor(tone),
            exAnimations.progress,
          )}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className={cn("-mt-7 text-center", size < 110 && "-mt-6")}>
        <p
          className={cn(
            size < 110
              ? "text-xl font-semibold tracking-tight tabular-nums sm:text-2xl"
              : exTypography.kpiPrimary,
            inverse ? "text-white" : exColors[tone].text,
          )}
        >
          {display}
        </p>
        <p
          className={cn(
            exTypography.caption,
            inverse && "text-white/40",
            size < 110 && exTypography.micro,
          )}
        >
          {label}
        </p>
        {statusLabel ? (
          <p
            className={cn(
              "mt-0.5 font-medium",
              exTypography.caption,
              inverse ? "text-white/55" : exColors[tone].text,
            )}
          >
            {statusLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}
