"use client";

import type { EvidenceItem } from "@/lib/intelligence/enterprise/types";
import { gfType } from "@/lib/design-system/signature";
import { cn } from "@/lib/utils";

function formatValue(value: EvidenceItem["value"]): string {
  if (value == null) return "indisponível";
  if (typeof value === "number") {
    return new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 2,
    }).format(value);
  }
  return String(value);
}

export function GFEvidenceDrawer({
  evidence,
  className,
}: {
  evidence: EvidenceItem[];
  className?: string;
}) {
  if (evidence.length === 0) {
    return (
      <p
        data-gf-evidence-drawer=""
        data-empty="1"
        className={cn(gfType.caption, className)}
      >
        Sem evidências registradas — nenhuma afirmação numérica adicional.
      </p>
    );
  }

  return (
    <details
      data-gf-evidence-drawer=""
      className={cn(
        "rounded-xl border border-[var(--gf-border-subtle)] bg-[var(--gf-surface-raised)] p-3",
        className,
      )}
      open
    >
      <summary className={cn(gfType.cardTitle, "cursor-pointer")}>
        Evidências ({evidence.length})
      </summary>
      <ul className="mt-2 space-y-3">
        {evidence.map((e) => (
          <li
            key={e.id}
            data-gf-evidence-item=""
            className="rounded-lg border border-[var(--gf-border-subtle)] p-2 text-xs text-[var(--text-secondary)]"
          >
            <p className="font-medium text-[var(--text-primary)]">
              {e.metric ?? e.entity ?? e.source}
            </p>
            <p>
              Valor:{" "}
              <span className="text-[var(--text-primary)]">
                {formatValue(e.value)}
                {e.unit ? ` ${e.unit}` : ""}
              </span>
            </p>
            <p>
              Fonte: {e.source} · tipo: {e.sourceType} · módulo: {e.module}
            </p>
            <p>
              Período: {e.period ?? "n/d"} · atualização: {e.calculatedAt ?? "n/d"}
            </p>
            <p>
              Freshness: {e.freshness ?? "n/d"} · reliability:{" "}
              {e.reliability ?? "n/d"}
            </p>
            {e.deepLink ? (
              <a
                href={e.deepLink}
                className="text-[var(--brand-gold)] hover:underline"
                data-evidence-deeplink=""
              >
                Abrir origem
              </a>
            ) : (
              <span>Sem deep link</span>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
