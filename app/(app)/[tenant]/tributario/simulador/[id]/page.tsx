import { redirect } from "next/navigation";
import { TributarioHubNav } from "@/components/tax/tributario-hub-nav";
import {
  GFTaxAssumptionsPanel,
  GFTaxImpactChart,
  GFTaxRegimeComparison,
  GFTaxSimulationTrace,
} from "@/components/gf/gf-tax-simulation";
import { GFSection } from "@/components/gf/gf-section";
import { requireTaxPagePermission } from "@/lib/tax/page-auth";
import { gfType } from "@/lib/design-system/signature";

export const metadata = { title: "Simulação · Tributário" };

export default async function SimulacaoDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant: tenantSlug, id } = await params;
  try {
    await requireTaxPagePermission(tenantSlug, "tax.simular");
  } catch {
    redirect(`/${tenantSlug}/tributario`);
  }
  return (
    <div
      className="space-y-4 p-4 sm:p-6"
      data-tax-simulation-detail=""
      data-simulation-id={id}
    >
      <h1 className={gfType.pageTitle}>Simulação {id}</h1>
      <TributarioHubNav tenantSlug={tenantSlug} />
      <GFSection title="Impacto">
        <div className="grid gap-2 sm:grid-cols-3">
          <GFTaxImpactChart label="Caixa" value={null} />
          <GFTaxImpactChart label="EBITDA" value={null} />
          <GFTaxImpactChart label="Margem" value={null} />
        </div>
      </GFSection>
      <GFTaxAssumptionsPanel
        assumptions={[]}
        limitations={["Aguardando dados/migration para resultados"]}
      />
      <GFTaxSimulationTrace steps={["isolation:ok", `id:${id}`]} />
      <GFTaxRegimeComparison
        winnerLabel="n/d"
        confidence="indisponivel"
      />
    </div>
  );
}
