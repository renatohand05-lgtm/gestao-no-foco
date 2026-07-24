import Link from "next/link";

import {
  ExecutiveButton,
  ExecutiveEmptyState,
  ExecutiveSection,
} from "@/components/executive";
import { formatCurrency } from "@/lib/format";
import { gofMotion, gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  faturamento: number | null;
  negociacao: number | null;
  conversaoLabel: string;
  available: boolean;
};

/**
 * Resumo compacto CI no Dashboard — DS oficial (Gate 19.1).
 */
export function CommercialIntelligenceSummaryCard({
  tenantSlug,
  faturamento,
  negociacao,
  conversaoLabel,
  available,
}: Props) {
  return (
    <div
      data-dashboard-block="inteligencia-comercial"
      className={gofMotion.fade}
    >
      <ExecutiveSection
        title="Inteligência Comercial"
        description="Pipeline, conversão e orçamentos que pedem ação."
        panel
        actions={
          <ExecutiveButton
            render={<Link href={`/${tenantSlug}/vendas/dashboard`} />}
          >
            Abrir Inteligência Comercial
          </ExecutiveButton>
        }
      >
        {available ? (
          <dl className="flex flex-wrap gap-x-6 gap-y-2">
            <div>
              <dt className={cn(gofTypography.caption, "inline")}>
                Faturamento:{" "}
              </dt>
              <dd className="inline font-medium tabular-nums">
                {faturamento == null ? "—" : formatCurrency(faturamento)}
              </dd>
            </div>
            <div>
              <dt className={cn(gofTypography.caption, "inline")}>
                Negociação:{" "}
              </dt>
              <dd className="inline font-medium tabular-nums">
                {negociacao == null ? "—" : formatCurrency(negociacao)}
              </dd>
            </div>
            <div>
              <dt className={cn(gofTypography.caption, "inline")}>
                Conversão:{" "}
              </dt>
              <dd className="inline font-medium tabular-nums">
                {conversaoLabel}
              </dd>
            </div>
          </dl>
        ) : (
          <ExecutiveEmptyState
            title="Dados parciais"
            description="Dados parciais ou indisponíveis neste momento."
            className="py-6"
          />
        )}
      </ExecutiveSection>
    </div>
  );
}
