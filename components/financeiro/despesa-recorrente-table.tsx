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
import { formatCurrency, formatDateOnly } from "@/lib/financeiro/format";
import type { DespesaRecorrente } from "@/lib/financeiro/despesa-recorrente-service";

type Props = {
  tenantSlug: string;
  items: DespesaRecorrente[];
};

export function DespesaRecorrenteTable({ tenantSlug, items }: Props) {
  return (
    <DataTable>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descrição</TableHead>
            <TableHead className="hidden sm:table-cell">Valor</TableHead>
            <TableHead className="hidden md:table-cell">Próxima</TableHead>
            <TableHead className="hidden lg:table-cell">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Link
                  href={`/${tenantSlug}/financeiro/despesas-recorrentes/${item.id}`}
                  className="font-medium hover:underline"
                >
                  {item.descricao}
                </Link>
                <p className="text-xs text-muted-foreground sm:hidden">
                  {formatCurrency(Number(item.valor))}
                </p>
              </TableCell>
              <TableCell className="hidden sm:table-cell tabular-nums">
                {formatCurrency(Number(item.valor))}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {item.proxima_competencia
                  ? formatDateOnly(item.proxima_competencia)
                  : "—"}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-sm">
                {!item.ativo
                  ? "Encerrada"
                  : item.pausada
                    ? "Pausada"
                    : "Ativa"}
                {` · ${item.ocorrencias_geradas} gerada(s)`}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTable>
  );
}
