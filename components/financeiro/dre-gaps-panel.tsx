import Link from "next/link";

import {
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
import { buttonVariants } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { formatCurrency, formatDateOnly } from "@/lib/financeiro/format";
import { cn } from "@/lib/utils";
import type { DreGap } from "@/types/dre";

type Props = {
  tenantSlug: string;
  gaps: DreGap[];
};

function origemLabel(origem: DreGap["origem"]) {
  if (origem === "venda") return "Venda";
  if (origem === "conta_receber") return "Conta a receber";
  return "Conta a pagar";
}

function corrigirHref(tenantSlug: string, gap: DreGap): string | null {
  if (gap.origem === "conta_pagar") {
    return `/${tenantSlug}/financeiro/contas-pagar/${gap.corrigir_id}/editar?classificacaoOnly=true`;
  }
  if (gap.origem === "conta_receber") {
    return `/${tenantSlug}/financeiro/contas-receber/${gap.corrigir_id}/editar?classificacaoOnly=true`;
  }
  if (gap.origem === "venda") {
    return `/${tenantSlug}/vendas/${gap.corrigir_id}/editar`;
  }
  return null;
}

export function DreGapsPanel({ tenantSlug, gaps }: Props) {
  if (gaps.length === 0) {
    return (
      <SectionCard
        title="Classificação incompleta"
        description="Registros do período sem campos financeiros suficientes para o DRE"
      >
        <p className="text-sm text-muted-foreground">
          Nenhuma pendência de classificação no período e filtros atuais.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Classificação incompleta"
      description={`${gaps.length} registro${gaps.length === 1 ? "" : "s"} com campos faltantes`}
    >
      <DataTable>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Origem</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="hidden sm:table-cell">Competência</TableHead>
              <TableHead className="hidden md:table-cell">
                Campos faltantes
              </TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gaps.map((gap) => {
              const href = corrigirHref(tenantSlug, gap);
              return (
                <TableRow key={`${gap.origem}-${gap.id}`}>
                  <TableCell className="whitespace-nowrap">
                    {origemLabel(gap.origem)}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{gap.descricao}</p>
                    <p className="text-xs text-muted-foreground md:hidden">
                      {gap.campos_faltantes.join(", ")}
                    </p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell whitespace-nowrap">
                    {formatDateOnly(gap.data_competencia)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <code className="text-xs text-muted-foreground">
                      {gap.campos_faltantes.join(", ")}
                    </code>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(gap.valor)}
                  </TableCell>
                  <TableCell className="text-right">
                    {href ? (
                      <Link
                        href={href}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                        )}
                      >
                        Corrigir
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTable>
    </SectionCard>
  );
}
