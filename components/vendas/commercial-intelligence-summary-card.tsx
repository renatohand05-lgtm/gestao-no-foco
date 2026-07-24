import Link from "next/link";

import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  faturamento: number | null;
  negociacao: number | null;
  conversaoLabel: string;
  available: boolean;
};

/**
 * Resumo compacto para o Dashboard principal — não duplica a central.
 */
export function CommercialIntelligenceSummaryCard({
  tenantSlug,
  faturamento,
  negociacao,
  conversaoLabel,
  available,
}: Props) {
  return (
    <section
      className={cn(
        "rounded-lg border bg-card p-4 sm:p-5",
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
      )}
      data-dashboard-block="inteligencia-comercial"
    >
      <div className="min-w-0 space-y-1">
        <h2 className="text-base font-semibold">Inteligência Comercial</h2>
        <p className="text-sm text-muted-foreground">
          Pipeline, conversão e orçamentos que pedem ação.
        </p>
        {available ? (
          <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <div>
              <dt className="inline text-muted-foreground">Faturamento: </dt>
              <dd className="inline font-medium tabular-nums">
                {faturamento == null ? "—" : formatCurrency(faturamento)}
              </dd>
            </div>
            <div>
              <dt className="inline text-muted-foreground">Negociação: </dt>
              <dd className="inline font-medium tabular-nums">
                {negociacao == null ? "—" : formatCurrency(negociacao)}
              </dd>
            </div>
            <div>
              <dt className="inline text-muted-foreground">Conversão: </dt>
              <dd className="inline font-medium tabular-nums">{conversaoLabel}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Dados parciais ou indisponíveis neste momento.
          </p>
        )}
      </div>
      <Link
        href={`/${tenantSlug}/vendas/dashboard`}
        className="inline-flex shrink-0 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Abrir Inteligência Comercial
      </Link>
    </section>
  );
}
