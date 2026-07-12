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
  getMovimentacaoBancariaTipoLabel,
} from "@/lib/financeiro/format";
import type { FluxoCaixaLancamento } from "@/types/fluxo-caixa";
import type { MovimentacaoBancariaTipo } from "@/types/movimentacoes-bancarias";

type Props = {
  items: FluxoCaixaLancamento[];
};

function getTipoBadgeVariant(tipo: MovimentacaoBancariaTipo | null) {
  if (tipo === "entrada") return "default" as const;
  if (tipo === "saida") return "destructive" as const;
  return "secondary" as const;
}

function getValorClassName(direcao: FluxoCaixaLancamento["direcao"]) {
  if (direcao === "entrada") return "text-emerald-700 dark:text-emerald-400";
  return "text-rose-700 dark:text-rose-400";
}

function getNaturezaLabel(natureza: FluxoCaixaLancamento["natureza"]) {
  return natureza === "realizado" ? "Realizado" : "Previsto";
}

function getTipoLabel(item: FluxoCaixaLancamento) {
  if (item.tipo) {
    return getMovimentacaoBancariaTipoLabel(item.tipo);
  }
  return item.direcao === "entrada" ? "Entrada" : "Saída";
}

export function FluxoCaixaMovimentacoesTable({ items }: Props) {
  return (
    <DataTable>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="hidden sm:table-cell">Conta</TableHead>
            <TableHead className="hidden md:table-cell">Categoria</TableHead>
            <TableHead className="hidden lg:table-cell">Centro de Custo</TableHead>
            <TableHead className="hidden xl:table-cell">Status</TableHead>
            <TableHead className="hidden xl:table-cell">Tipo</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="whitespace-nowrap">
                {formatDateOnly(item.data)}
              </TableCell>
              <TableCell>
                <p className="font-medium">{item.descricao}</p>
                <p className="text-xs text-muted-foreground sm:hidden">
                  {item.conta_bancaria_nome ?? "—"}
                </p>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {item.conta_bancaria_nome ?? "—"}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {item.categoria_nome ?? "—"}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {item.centro_custo_nome ?? "—"}
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <Badge
                  variant={
                    item.natureza === "realizado" ? "default" : "outline"
                  }
                >
                  {getNaturezaLabel(item.natureza)}
                </Badge>
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                <Badge variant={getTipoBadgeVariant(item.tipo)}>
                  {getTipoLabel(item)}
                </Badge>
              </TableCell>
              <TableCell
                className={`text-right font-medium ${getValorClassName(item.direcao)}`}
              >
                {item.direcao === "saida" ? "−" : "+"}
                {formatCurrency(item.valor)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTable>
  );
}
