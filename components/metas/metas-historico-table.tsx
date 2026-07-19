"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Target } from "lucide-react";

import { MetaVendasDeleteButton } from "@/components/metas/meta-vendas-delete-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/dashboard/format";
import { META_STATUS_LABEL } from "@/lib/metas/projection";
import type { MetaHistoricoRow } from "@/types/metas-vendas";
import type { PaginatedResult } from "@/types/pagination";

type Props = {
  tenantSlug: string;
  result: PaginatedResult<MetaHistoricoRow>;
};

export function MetasHistoricoTable({ tenantSlug, result }: Props) {
  const searchParams = useSearchParams();

  if (result.total === 0) {
    return (
      <EmptyState
        icon={Target}
        title="Nenhuma meta cadastrada"
        description="Defina a meta mensal de vendas — é um dos caminhos mais rápidos para o primeiro valor no Dashboard."
        impact="Ativa Score, gap, projeção e ritmo no cockpit executivo."
        action={{
          label: "Cadastrar meta mensal",
          href: `/${tenantSlug}/configuracoes/metas/nova`,
        }}
      />
    );
  }

  function buildPageHref(targetPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(targetPage));
    return `/${tenantSlug}/configuracoes/metas?${params.toString()}`;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Competência</TableHead>
              <TableHead>Centro</TableHead>
              <TableHead className="text-right">Meta</TableHead>
              <TableHead className="text-right">Realizado</TableHead>
              <TableHead className="text-right">Atingimento</TableHead>
              <TableHead className="text-right">Proj. corridos</TableHead>
              <TableHead className="text-right">Proj. úteis</TableHead>
              <TableHead className="text-right">Gap</TableHead>
              <TableHead className="text-right">Nec. / dia útil</TableHead>
              <TableHead className="text-right">Ritmo esp.</TableHead>
              <TableHead className="text-right">Ritmo atual</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.map((row) => (
              <TableRow key={row.meta.id}>
                <TableCell className="font-medium tabular-nums">
                  {row.meta.competencia.slice(0, 7)}
                </TableCell>
                <TableCell>
                  {row.meta.centro_custo_nome ?? "Geral"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(row.meta.valor_meta)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(row.faturamento_realizado)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.percentual_atingido === null
                    ? "—"
                    : formatPercent(row.percentual_atingido)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(row.projecao_dias_corridos)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(row.projecao_dias_uteis)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.gap_projetado === null
                    ? "—"
                    : formatCurrency(row.gap_projetado)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.necessario_por_dia_util === null
                    ? "—"
                    : formatCurrency(row.necessario_por_dia_util)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPercent(row.ritmo_esperado)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.ritmo_atual === null
                    ? "—"
                    : formatPercent(row.ritmo_atual)}
                </TableCell>
                <TableCell>{META_STATUS_LABEL[row.status]}</TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Link
                      href={`/${tenantSlug}/configuracoes/metas/${row.meta.id}/editar`}
                      className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Editar
                    </Link>
                    <MetaVendasDeleteButton
                      tenantSlug={tenantSlug}
                      metaId={row.meta.id}
                      competencia={row.meta.competencia}
                      centroNome={row.meta.centro_custo_nome}
                      valorMeta={row.meta.valor_meta}
                      size="sm"
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {result.totalPages > 1 ? (
        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          buildPageHref={buildPageHref}
        />
      ) : null}
    </div>
  );
}
