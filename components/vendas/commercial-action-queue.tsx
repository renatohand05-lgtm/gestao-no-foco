import Link from "next/link";

import type { CiActionItem } from "@/lib/vendas/commercial-intelligence-types";
import { ciResponsavelUiLabel } from "@/lib/vendas/commercial-intelligence-compose";
import { formatCurrency } from "@/lib/format";

type Props = {
  tenantSlug: string;
  items: CiActionItem[];
};

export function CommercialActionQueue({ tenantSlug, items }: Props) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Orçamentos que exigem ação</h2>
        <p className="text-sm text-muted-foreground">
          Critérios: orçamento, em andamento, alto valor, VIP, desconto alto e
          ausência de atualização (timestamp). Sem validade inventada.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">
          Nenhum orçamento exige ação no momento.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {items.map((item) => (
            <article
              key={item.id}
              className="min-w-0 rounded-lg border bg-card p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.clienteNome}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.statusLabel} ·{" "}
                    {ciResponsavelUiLabel(item.responsavel.origem)}:{" "}
                    {item.responsavel.nome}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatCurrency(item.valor)}
                </p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{item.motivo}</p>
              <p className="mt-1 text-sm font-medium">{item.acao}</p>
              <Link
                href={`/${tenantSlug}/vendas/${item.hrefId}`}
                className="mt-3 inline-block text-sm text-primary hover:underline"
              >
                Abrir venda
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
