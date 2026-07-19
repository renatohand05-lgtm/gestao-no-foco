import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import { OS_STATUS_LABELS, type OsStatus } from "@/lib/ordens/os-status";
import type { OrdemServicoListItem } from "@/lib/ordens/ordem-servico-service";

type Props = {
  tenantSlug: string;
  items: OrdemServicoListItem[];
};

export function OsTable({ tenantSlug, items }: Props) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma ordem encontrada com os filtros atuais.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b border-border/70">
            <th className="py-2 pr-3 font-medium">Nº</th>
            <th className="py-2 pr-3 font-medium">Cliente</th>
            <th className="py-2 pr-3 font-medium">Veículo</th>
            <th className="py-2 pr-3 font-medium">Status</th>
            <th className="py-2 pr-3 font-medium">Entrada</th>
            <th className="py-2 pr-3 font-medium">Previsão</th>
            <th className="py-2 pr-3 font-medium text-right">Total</th>
            <th className="py-2 font-medium">Fat.</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border/40">
              <td className="py-2.5 pr-3">
                <Link
                  href={`/${tenantSlug}/ordens/${item.id}`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  #{item.numero}
                </Link>
              </td>
              <td className="py-2.5 pr-3">{item.cliente_nome ?? "—"}</td>
              <td className="py-2.5 pr-3">
                <div>{item.placa ?? "—"}</div>
                <div className="text-xs text-muted-foreground">
                  {item.modelo ?? ""}
                </div>
              </td>
              <td className="py-2.5 pr-3">
                <StatusBadge
                  label={OS_STATUS_LABELS[item.status as OsStatus] ?? item.status}
                />
              </td>
              <td className="py-2.5 pr-3 tabular-nums text-xs">
                {item.data_abertura}
              </td>
              <td className="py-2.5 pr-3 tabular-nums text-xs">
                {item.previsao_entrega
                  ? item.previsao_entrega.slice(0, 16).replace("T", " ")
                  : "—"}
              </td>
              <td className="py-2.5 pr-3 text-right tabular-nums font-medium">
                {formatCurrency(item.valor_total)}
              </td>
              <td className="py-2.5 text-xs">
                {item.venda_id ? "Sim" : "Não"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
