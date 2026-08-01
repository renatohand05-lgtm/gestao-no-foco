import { redirect } from "next/navigation";
import { TributarioHubNav } from "@/components/tax/tributario-hub-nav";
import {
  GFTaxAssumptionsPanel,
  GFTaxRegimeComparison,
} from "@/components/gf/gf-tax-simulation";
import { GFSection } from "@/components/gf/gf-section";
import { requireTaxPagePermission } from "@/lib/tax/page-auth";
import { gfType } from "@/lib/design-system/signature";

export const metadata = { title: "Comparar regimes · Tributário" };

export default async function CompararRegimesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  try {
    await requireTaxPagePermission(tenantSlug, "tax.comparar_regimes");
  } catch {
    try {
      await requireTaxPagePermission(tenantSlug, "tax.simular");
    } catch {
      redirect(`/${tenantSlug}/tributario`);
    }
  }
  return (
    <div className="space-y-4 p-4 sm:p-6" data-tax-regime-compare-page="">
      <h1 className={gfType.pageTitle}>Comparação de regimes</h1>
      <TributarioHubNav tenantSlug={tenantSlug} />
      <GFSection title="Resultado">
        <GFTaxRegimeComparison
          winnerLabel="aguardando premissas e regras publicadas"
          confidence="indisponivel"
        />
      </GFSection>
      <GFTaxAssumptionsPanel
        assumptions={[]}
        limitations={[
          "Não recomenda regime como decisão definitiva",
          "Exige validação contábil/fiscal",
        ]}
      />
      <p className={gfType.caption}>
        Compara somente regimes configurados e aplicáveis.
      </p>
    </div>
  );
}
