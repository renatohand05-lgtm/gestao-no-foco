import Link from "next/link";

import { buildDashboardDrillDownHref } from "@/lib/dashboard/drill-down";
import {
  formatCurrency,
  formatPercent,
} from "@/lib/dashboard/format";
import { ComercialStatusBadge } from "@/components/dashboard/comercial/comercial-status-badge";
import { ExecutiveCard, ExecutiveSection } from "@/components/executive";
import { exAnimations, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import { TENDENCIA_LABEL, type CommercialPanelData } from "@/types/commercial-panel";
import type { DashboardFilters } from "@/types/dashboard-executive";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props = {
  tenantSlug: string;
  data: CommercialPanelData;
  filters: DashboardFilters;
};

export function ComercialCentersTable({ tenantSlug, data, filters }: Props) {
  const monthFilters: DashboardFilters = {
    ...filters,
    dataDe: data.dataDe,
    dataAte: data.dataAte,
  };

  return (
    <ExecutiveSection
      title="Por centro de custo"
      description='Metas específicas por centro — não misturadas com a meta geral. Tendência por centro permanece "insuficiente" até existir janela 7d dedicada.'
    >
      {data.centros.length === 0 ? (
        <ExecutiveCard padding={20} className={exAnimations.fade}>
          <div className="flex min-h-[6rem] flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 text-center">
            <p className={exTypography.caption}>
              Nenhum centro com meta ou faturamento neste mês.
            </p>
          </div>
        </ExecutiveCard>
      ) : (
        <ExecutiveCard
          padding={16}
          className={cn("overflow-hidden", exAnimations.fade)}
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Centro</TableHead>
                  <TableHead className="text-right">Meta</TableHead>
                  <TableHead className="text-right">Realizado</TableHead>
                  <TableHead className="text-right">Projeção</TableHead>
                  <TableHead className="text-right">Ating.</TableHead>
                  <TableHead className="text-right">Gap</TableHead>
                  <TableHead className="text-right">Nec. útil</TableHead>
                  <TableHead className="text-right">Ticket</TableHead>
                  <TableHead>Tendência</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.centros.map((row) => (
                  <TableRow
                    key={row.centro_custo_id}
                    className="motion-safe:transition-colors motion-safe:hover:bg-muted/40"
                  >
                    <TableCell>
                      <Link
                        href={buildDashboardDrillDownHref(tenantSlug, "vendas", {
                          ...monthFilters,
                          centroCusto: row.centro_custo_id,
                        })}
                        className={cn(
                          "font-medium text-primary underline-offset-4 hover:underline",
                          exAnimations.focusRing,
                        )}
                      >
                        {row.centro_nome}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.valor_meta === null
                        ? "—"
                        : formatCurrency(row.valor_meta)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(row.faturamento_realizado)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(row.projecao_dias_uteis)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.percentual_atingido === null
                        ? "—"
                        : formatPercent(row.percentual_atingido)}
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
                      {formatCurrency(row.ticket_medio)}
                    </TableCell>
                    <TableCell>{TENDENCIA_LABEL[row.tendencia]}</TableCell>
                    <TableCell>
                      <ComercialStatusBadge status={row.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ExecutiveCard>
      )}
    </ExecutiveSection>
  );
}
