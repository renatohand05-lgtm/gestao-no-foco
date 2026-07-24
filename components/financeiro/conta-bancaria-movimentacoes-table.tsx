import {
  ExecutiveBadge,
  ExecutiveTable,
  type ExecutiveTableColumn,
} from "@/components/executive";
import { gofColors } from "@/lib/design-system/foundation";
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

function getTipoBadgeTone(tipo: MovimentacaoBancariaTipo) {
  if (tipo === "entrada") return "success" as const;
  if (tipo === "saida") return "danger" as const;
  return "neutral" as const;
}

function getValorClassName(tipo: MovimentacaoBancariaTipo) {
  if (tipo === "entrada") return gofColors.success.text;
  if (tipo === "saida") return gofColors.danger.text;
  return "";
}

function formatSignedValor(tipo: MovimentacaoBancariaTipo, valor: number) {
  const prefix = tipo === "saida" ? "−" : tipo === "entrada" ? "+" : "";
  return `${prefix}${formatCurrency(valor)}`;
}

export function ContaBancariaMovimentacoesTable({ items }: Props) {
  const columns: ExecutiveTableColumn<MovimentacaoBancariaListItem>[] = [
    {
      id: "data",
      header: "Data",
      className: "whitespace-nowrap",
      cell: (item) => formatDateOnly(item.data_movimentacao),
    },
    {
      id: "tipo",
      header: "Tipo",
      cell: (item) => (
        <ExecutiveBadge tone={getTipoBadgeTone(item.tipo)}>
          {getMovimentacaoBancariaTipoLabel(item.tipo)}
        </ExecutiveBadge>
      ),
    },
    {
      id: "descricao",
      header: "Descrição",
      cell: (item) => (
        <>
          <p className="font-medium">{item.descricao}</p>
          <p className="text-xs text-muted-foreground md:hidden">
            {getMovimentacaoBancariaOrigemLabel(item.origem)}
          </p>
        </>
      ),
    },
    {
      id: "origem",
      header: "Origem",
      className: "hidden md:table-cell",
      cell: (item) => getMovimentacaoBancariaOrigemLabel(item.origem),
    },
    {
      id: "saldo_anterior",
      header: "Saldo anterior",
      align: "right",
      className: "hidden lg:table-cell",
      cell: (item) => formatCurrency(item.saldo_anterior),
    },
    {
      id: "valor",
      header: "Valor",
      align: "right",
      className: "font-medium",
      cell: (item) => (
        <span className={getValorClassName(item.tipo)}>
          {formatSignedValor(item.tipo, item.valor)}
        </span>
      ),
    },
    {
      id: "saldo_novo",
      header: "Saldo novo",
      align: "right",
      className: "hidden sm:table-cell",
      cell: (item) => formatCurrency(item.saldo_novo),
    },
  ];

  return (
    <ExecutiveTable
      columns={columns}
      rows={items}
      getRowId={(row) => row.id}
      density="comfortable"
      stickyHeader
      emptyMessage="Nenhuma movimentação registrada nesta conta."
    />
  );
}
