"use client";

import { memo } from "react";

import {
  CRM_FUNIL_COLORS,
  CRM_FUNIL_LABELS,
  type CrmFunilStage,
} from "@/lib/crm/constants";
import { cn } from "@/lib/utils";

type CrmScoreBadgesProps = {
  score: number;
  classificacao?: string | null;
  estagioFunil?: CrmFunilStage;
  className?: string;
};

function scoreTone(score: number) {
  if (score >= 80) return "bg-emerald-100 text-emerald-800";
  if (score >= 50) return "bg-amber-100 text-amber-900";
  return "bg-slate-100 text-slate-700";
}

export const CrmScoreBadges = memo(function CrmScoreBadges({
  score,
  classificacao,
  estagioFunil,
  className,
}: CrmScoreBadgesProps) {
  const stage = estagioFunil ?? "lead";
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", scoreTone(score))}>
        Score {Math.round(score)}
      </span>
      {classificacao ? (
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">
          Classe {classificacao}
        </span>
      ) : null}
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-xs font-semibold",
          CRM_FUNIL_COLORS[stage],
        )}
      >
        {CRM_FUNIL_LABELS[stage]}
      </span>
    </div>
  );
});
