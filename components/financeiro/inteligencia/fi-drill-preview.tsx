import Link from "next/link";

import { SectionCard } from "@/components/ui/section-card";
import { formatCurrency, formatDateOnly } from "@/lib/financeiro/format";
import type { DreDrillItem } from "@/types/dre";

type Props = {
  tenantSlug: string;
  items: DreDrillItem[];
  filters: { dataDe: string; dataAte: string };
};

function documentHref(tenantSlug: string, item: DreDrillItem) {
  if (item.origem === "conta_pagar") {
    return `/${tenantSlug}/financeiro/contas-pagar/${item.corrigirId}`;
  }
  if (item.origem === "conta_receber") {
    return `/${tenantSlug}/financeiro/contas-receber/${item.corrigirId}`;
  }
  if (item.origem === "venda") {
    return `/${tenantSlug}/vendas/${item.corrigirId}`;
  }
  return `/${tenantSlug}/financeiro/dre`;
}

export function FiDrillPreview({ tenantSlug, items, filters }: Props) {
  const dreBase = `/${tenantSlug}/financeiro/dre?dataDe=${filters.dataDe}&dataAte=${filters.dataAte}`;

  return (
    <SectionCard
      title="Drill-down executivo"
      description="Indicador → linha DRE → lançamentos → documento/origem. Reutiliza o DRE."
      contentClassName="pt-0"
    >
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <Link
          href={dreBase}
          className="rounded-full border border-border px-2.5 py-1 hover:bg-muted"
        >
          Abrir DRE completo
        </Link>
        <Link
          href={`/${tenantSlug}/financeiro/fluxo-caixa?dataDe=${filters.dataDe}&dataAte=${filters.dataAte}`}
          className="rounded-full border border-border px-2.5 py-1 hover:bg-muted"
        >
          Abrir Fluxo
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sem lançamentos drilláveis no período.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border/70">
                <th className="py-2 pr-3 font-medium">Linha</th>
                <th className="py-2 pr-3 font-medium">Descrição</th>
                <th className="py-2 pr-3 font-medium">Competência</th>
                <th className="py-2 pr-3 font-medium">Origem</th>
                <th className="py-2 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={`${item.origem}-${item.id}`}
                  className="border-b border-border/40"
                >
                  <td className="py-2 pr-3 align-top text-xs">{item.linha}</td>
                  <td className="py-2 pr-3 align-top">
                    <Link
                      href={documentHref(tenantSlug, item)}
                      className="font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      {item.descricao}
                    </Link>
                    {item.fornecedorNome ? (
                      <p className="text-xs text-muted-foreground">
                        {item.fornecedorNome}
                      </p>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3 align-top tabular-nums text-xs">
                    {formatDateOnly(item.competencia)}
                  </td>
                  <td className="py-2 pr-3 align-top text-xs">{item.origem}</td>
                  <td className="py-2 text-right align-top tabular-nums font-medium">
                    {formatCurrency(item.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
