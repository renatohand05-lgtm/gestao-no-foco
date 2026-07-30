"use client";

import { useMemo } from "react";
import { Brain } from "lucide-react";

import { ExecutiveEmptyState } from "@/components/executive";
import { ExecutiveBadge } from "@/components/executive/ExecutiveBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ImportLearningRule } from "@/lib/import-engine";
import { cn } from "@/lib/utils";
import {
  formatDateTime,
  learningOriginLabel,
} from "./intelligence-presentation";

type Props = {
  rules: ImportLearningRule[];
  className?: string;
};

/**
 * Painel exclusivo de aprendizado acumulado (Sprint 22.6.1).
 * Colunas pedidas pelo briefing; campos ausentes mostram "—".
 */
export function IntelligenceLearningPanel({ rules, className }: Props) {
  const sorted = useMemo(
    () => [...rules].sort((a, b) => (b.hitCount ?? 0) - (a.hitCount ?? 0)),
    [rules],
  );

  return (
    <section
      aria-label="Painel de aprendizado"
      className={cn(
        "space-y-4 rounded-xl border border-border/60 bg-card/40 p-4 sm:p-5",
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Brain className="size-4 text-muted-foreground" aria-hidden />
            <h2 className="text-sm font-semibold tracking-tight">
              Painel de Aprendizado
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Regras acumuladas por confirmação do utilizador — isoladas ao tenant.
          </p>
        </div>
        <ExecutiveBadge tone="info" variant="soft">
          {sorted.length} regra(s) aprendida(s)
        </ExecutiveBadge>
      </header>

      {sorted.length === 0 ? (
        <ExecutiveEmptyState
          title="Nenhuma regra aprendida"
          description="Confirme classificações na revisão de importação para a plataforma aprender (ex.: ENEL → Energia)."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Centro de custo</TableHead>
                <TableHead>Grupo DRE</TableHead>
                <TableHead className="text-right">Utilizações</TableHead>
                <TableHead>Última utilização</TableHead>
                <TableHead>Origem da regra</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="max-w-[140px] truncate text-sm">
                    {r.supplierSuggested ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate text-sm font-medium">
                    {r.categorySuggested ?? "—"}
                    {r.subcategorySuggested ? (
                      <span className="block text-[11px] font-normal text-muted-foreground">
                        {r.subcategorySuggested}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.costCenterSuggested ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.dreGroupSuggested ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm">
                    {r.hitCount}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDateTime(r.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <ExecutiveBadge tone="neutral" variant="outline">
                      {learningOriginLabel(r.source)}
                    </ExecutiveBadge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
