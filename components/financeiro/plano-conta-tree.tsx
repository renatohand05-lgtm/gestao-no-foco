import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { PlanoContaRowActions } from "@/components/financeiro/plano-conta-row-actions";
import { FinanceiroStatusBadge } from "@/components/financeiro/financeiro-status-badge";
import { DataTable, Table, TableBody, TableCell, TableRow } from "@/components/ui/data-table";
import {
  getPlanoContaNaturezaLabel,
  getPlanoContaTipoLabel,
} from "@/lib/financeiro/format";
import type { PlanoContaTreeNode } from "@/types/financeiro";

type PlanoContaTreeProps = {
  tenantSlug: string;
  nodes: PlanoContaTreeNode[];
};

function TreeRows({
  tenantSlug,
  nodes,
}: {
  tenantSlug: string;
  nodes: PlanoContaTreeNode[];
}) {
  return (
    <>
      {nodes.map((node) => (
        <TreeRow key={node.id} tenantSlug={tenantSlug} node={node} />
      ))}
    </>
  );
}

function TreeRow({
  tenantSlug,
  node,
}: {
  tenantSlug: string;
  node: PlanoContaTreeNode;
}) {
  const indent = node.depth * 20;

  return (
    <>
      <TableRow className="group">
        <TableCell>
          <div className="flex items-start gap-2" style={{ paddingLeft: indent }}>
            {node.depth > 0 ? (
              <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/70" />
            ) : (
              <span className="size-3.5 shrink-0" />
            )}
            <div className="min-w-0">
              <Link
                href={`/${tenantSlug}/financeiro/plano-contas/${node.id}`}
                className="block hover:underline"
              >
                <p className="font-medium">{node.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {node.codigo}
                  {node.natureza === "sintetica" ? " · Sintética" : " · Analítica"}
                </p>
              </Link>
            </div>
          </div>
        </TableCell>
        <TableCell className="hidden sm:table-cell">
          {getPlanoContaTipoLabel(node.tipo)}
        </TableCell>
        <TableCell className="hidden md:table-cell">
          {getPlanoContaNaturezaLabel(node.natureza)}
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          {node.aceita_lancamento ? "Sim" : "Não"}
        </TableCell>
        <TableCell className="hidden xl:table-cell">
          <FinanceiroStatusBadge ativo={node.ativo} />
        </TableCell>
        <TableCell>
          <PlanoContaRowActions tenantSlug={tenantSlug} item={node} />
        </TableCell>
      </TableRow>
      {node.children.length > 0 ? (
        <TreeRows tenantSlug={tenantSlug} nodes={node.children} />
      ) : null}
    </>
  );
}

export function PlanoContaTree({ tenantSlug, nodes }: PlanoContaTreeProps) {
  return (
    <DataTable>
      <Table>
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            <th className="h-10 px-4 font-medium">Conta</th>
            <th className="hidden h-10 px-4 font-medium sm:table-cell">Tipo</th>
            <th className="hidden h-10 px-4 font-medium md:table-cell">Natureza</th>
            <th className="hidden h-10 px-4 font-medium lg:table-cell">Lançamento</th>
            <th className="hidden h-10 px-4 font-medium xl:table-cell">Status</th>
            <th className="h-10 w-12 px-4" />
          </tr>
        </thead>
        <TableBody>
          <TreeRows tenantSlug={tenantSlug} nodes={nodes} />
        </TableBody>
      </Table>
    </DataTable>
  );
}
