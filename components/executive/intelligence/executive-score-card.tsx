import {
  ExecutiveBadge,
  ExecutiveCard,
  ExecutiveProgress,
} from "@/components/executive";
import { exAnimations, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import type { ExecutiveScoreResult } from "@/lib/intelligence/types";

const STATUS_LABEL: Record<ExecutiveScoreResult["status"], string> = {
  critico: "Crítico",
  atencao: "Atenção",
  bom: "Bom",
  excelente: "Excelente",
  sem_meta: "Sem meta",
  periodo_futuro: "Período futuro",
  dados_insuficientes: "Dados insuficientes",
};

type Props = {
  score: ExecutiveScoreResult;
};

export function ExecutiveScoreCard({ score }: Props) {
  return (
    <ExecutiveCard
      padding={24}
      className={cn("h-full", exAnimations.slide)}
      aria-label={`Score executivo: ${score.score ?? "n/d"}, ${STATUS_LABEL[score.status]}`}
    >
      <p className={exTypography.label}>Score executivo</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className={cn(exTypography.kpiPrimary, "leading-none")}>
          {score.score === null ? "—" : score.score}
          {score.score !== null ? (
            <span className="text-lg text-muted-foreground">/100</span>
          ) : null}
        </p>
        <ExecutiveBadge tone={score.tone}>
          {STATUS_LABEL[score.status]}
        </ExecutiveBadge>
      </div>
      <p className={cn("mt-3", exTypography.caption)}>{score.explanation}</p>
      {score.score !== null ? (
        <ExecutiveProgress
          value={score.score}
          tone={
            score.tone === "neutral" || score.tone === "info"
              ? "primary"
              : score.tone
          }
          showValue={false}
          size="sm"
          className="mt-4"
          label="Score"
        />
      ) : null}
      {score.factors.length > 0 ? (
        <ul className="mt-4 space-y-2" aria-label="Fatores do score">
          {score.factors.map((f) => (
            <li
              key={f.key}
              className="flex items-baseline justify-between gap-2 text-xs"
            >
              <span className="text-muted-foreground">
                {f.label}{" "}
                <span className="tabular-nums opacity-70">({f.weight}pt)</span>
              </span>
              <span className="font-semibold tabular-nums">{f.score}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </ExecutiveCard>
  );
}
