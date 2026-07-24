import {
  ExecutiveBadge,
  ExecutiveTable,
  type ExecutiveTableColumn,
} from "@/components/executive";
import { gofColors } from "@/lib/design-system/foundation";
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

function getTipoBadgeTone(tipo: MovimentacaoBancariaTipo | null) {
  if (tipo === "entrada") return "success" as const;
  if (tipo === "saida") return "danger" as const;
  return "neutral" as const;
}

function getValorClassName(direcao: FluxoCaixaLancamento["direcao"]) {
  if (direcao === "entrada") return gofColors.success.text;
  return gofColors.danger.text;
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
  const columns: ExecutiveTableColumn<FluxoCaixaLancamento>[] = [
    {
      id: "data",
      header: "Data",
      className: "whitespace-nowrap",
      cell: (item) => formatDateOnly(item.data),
    },
    {
      id: "descricao",
      header: "Descrição",
      cell: (item) => (
        <>
          <p className="font-medium">{item.descricao}</p>
          <p className="text-xs text-muted-foreground sm:hidden">
            {item.conta_bancaria_nome ?? "—"}
          </p>
        </>
      ),
    },
    {
      id: "conta",
      header: "Conta",
      className: "hidden sm:table-cell",
      cell: (item) => item.conta_bancaria_nome ?? "—",
    },
    {
      id: "categoria",
      header: "Categoria",
      className: "hidden md:table-cell",
      cell: (item) => item.categoria_nome ?? "—",
    },
    {
      id: "centro",
      header: "Centro de Custo",
      className: "hidden lg:table-cell",
      cell: (item) => item.centro_custo_nome ?? "—",
    },
    {
      id: "status",
      header: "Status",
      className: "hidden xl:table-cell",
      cell: (item) => (
        <ExecutiveBadge
          tone={item.natureza === "realizado" ? "success" : "neutral"}
          variant={item.natureza === "realizado" ? "soft" : "outline"}
        >
          {getNaturezaLabel(item.natureza)}
        </ExecutiveBadge>
      ),
    },
    {
      id: "tipo",
      header: "Tipo",
      className: "hidden xl:table-cell",
      cell: (item) => (
        <ExecutiveBadge tone={getTipoBadgeTone(item.tipo)}>
          {getTipoLabel(item)}
        </ExecutiveBadge>
      ),
    },
    {
      id: "valor",
      header: "Valor",
      align: "right",
      className: "font-medium",
      cell: (item) => (
        <span className={getValorClassName(item.direcao)}>
          {item.direcao === "saida" ? "−" : "+"}
          {formatCurrency(item.valor)}
        </span>
      ),
    },
  ];

  return (
    <ExecutiveTable
      columns={columns}
      rows={items}
      getRowId={(row) => row.id}
      density="comfortable"
      stickyHeader
    />
  );
}
