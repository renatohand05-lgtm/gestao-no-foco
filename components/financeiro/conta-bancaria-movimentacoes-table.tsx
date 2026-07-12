import { Badge } from "@/components/ui/badge";
import {
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
import {
  formatCurrency,
  formatDateOnly,
  getMovimentacaoBancariaOrigemLabel,
  getMovimentacaoBancariaTipoLabel,
} from "@/lib/financeiro/format";
import type {
  MovimentacaoBancariaListItem,
  MovimentacaoBancariaTipo,
} from "@/types/movimentacoes-bancarias";

type Props = {
  items: MovimentacaoBancariaListItem[];
};

function getTipoBadgeVariant(tipo: MovimentacaoBancariaTipo) {
  if (tipo === "entrada") return "default" as const;
  if (tipo === "saida") return "destructive" as const;
  return "secondary" as const;
}

function getValorClassName(tipo: MovimentacaoBancariaTipo) {
  if (tipo === "entrada") return "text-emerald-700 dark:text-emerald-400";
  if (tipo === "saida") return "text-rose-700 dark:text-rose-400";
  return "";
}

function formatSignedValor(tipo: MovimentacaoBancariaTipo, valor: number) {
  const prefix =
    tipo === "saida" ? "−" : tipo === "entrada" ? "+" : "";
  return `${prefix}${formatCurrency(valor)}`;
}

export function ContaBancariaMovimentacoesTable({ items }: Props) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma movimentação registrada nesta conta.
      </p>
    );
  }

  return (
    <DataTable>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="hidden md:table-cell">Origem</TableHead>
            <TableHead className="hidden lg:table-cell text-right">
              Saldo anterior
            </TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="hidden sm:table-cell text-right">
              Saldo novo
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="whitespace-nowrap">
                {formatDateOnly(item.data_movimentacao)}
              </TableCell>
              <TableCell>
                <Badge variant={getTipoBadgeVariant(item.tipo)}>
                  {getMovimentacaoBancariaTipoLabel(item.tipo)}
                </Badge>
              </TableCell>
              <TableCell>
                <p className="font-medium">{item.descricao}</p>
                <p className="text-xs text-muted-foreground md:hidden">
                  {getMovimentacaoBancariaOrigemLabel(item.origem)}
                </p>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {getMovimentacaoBancariaOrigemLabel(item.origem)}
              </TableCell>
              <TableCell className="hidden lg:table-cell text-right">
                {formatCurrency(item.saldo_anterior)}
              </TableCell>
              <TableCell
                className={`text-right font-medium ${getValorClassName(item.tipo)}`}
              >
                {formatSignedValor(item.tipo, item.valor)}
              </TableCell>
              <TableCell className="hidden sm:table-cell text-right">
                {formatCurrency(item.saldo_novo)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTable>
  );
}
