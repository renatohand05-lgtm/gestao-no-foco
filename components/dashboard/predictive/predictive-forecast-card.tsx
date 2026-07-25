import Link from "next/link";

import {
  ExecutiveBadge,
  ExecutiveCard,
} from "@/components/executive";
import type { PredictiveForecast } from "@/lib/predictive";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

function confidenceTone(
  c: PredictiveForecast["confidence"],
): "success" | "warning" | "danger" | "neutral" {
  if (c === "alta") return "success";
  if (c === "media") return "warning";
  return "danger";
}

function riskTone(
  r: PredictiveForecast["risk"],
): "success" | "warning" | "danger" | "neutral" | "info" {
  if (r === "baixo") return "success";
  if (r === "moderado") return "warning";
  if (r === "alto" || r === "critico") return "danger";
  return "neutral";
}

function trendTone(
  t: PredictiveForecast["trend"],
): "success" | "warning" | "danger" | "neutral" | "info" {
  if (t === "alta") return "success";
  if (t === "queda") return "danger";
  if (t === "estavel") return "info";
  return "neutral";
}

type Props = {
  forecast: PredictiveForecast;
};

export function PredictiveForecastCard({ forecast }: Props) {
  return (
    <ExecutiveCard padding={16} className="flex h-full min-w-0 flex-col space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-foreground">{forecast.title}</p>
        <ExecutiveBadge tone={confidenceTone(forecast.confidence)} variant="soft">
          Confiança {forecast.confidenceLabel}
        </ExecutiveBadge>
      </div>

      <div>
        <p
          className="text-xl font-semibold tabular-nums tracking-tight"
          aria-label={`${forecast.title}: ${forecast.primaryValue}`}
        >
          {forecast.primaryValue}
        </p>
        <p className={cn(gofTypography.caption, "mt-0.5")}>{forecast.horizon}</p>
      </div>

      <p className={cn(gofTypography.subtitle, "text-sm")}>{forecast.headline}</p>

      <div className="flex flex-wrap gap-1.5">
        <ExecutiveBadge tone={trendTone(forecast.trend)} variant="outline">
          Tendência · {forecast.trendLabel}
        </ExecutiveBadge>
        <ExecutiveBadge tone={riskTone(forecast.risk)} variant="outline">
          Risco · {forecast.riskLabel}
        </ExecutiveBadge>
      </div>

      {forecast.evidence.length > 0 ? (
        <ul className="space-y-1" aria-label={`Evidências · ${forecast.title}`}>
          {forecast.evidence.slice(0, 3).map((e) => (
            <li key={e.id} className={gofTypography.caption}>
              <span className="font-medium text-foreground">{e.label}:</span>{" "}
              {e.value}
            </li>
          ))}
        </ul>
      ) : forecast.unavailableReason ? (
        <p className={gofTypography.caption}>{forecast.unavailableReason}</p>
      ) : null}

      {forecast.href ? (
        <Link
          href={forecast.href}
          className="mt-auto text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          Abrir módulo
        </Link>
      ) : null}
    </ExecutiveCard>
  );
}
