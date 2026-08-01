import { redirect } from "next/navigation";
import { TributarioHubNav } from "@/components/tax/tributario-hub-nav";
import {
  GFTaxAssumptionsPanel,
  GFTaxSimulationBuilder,
  GFTaxVariableEditor,
} from "@/components/gf/gf-tax-simulation";
import { requireTaxPagePermission } from "@/lib/tax/page-auth";
import { gfType } from "@/lib/design-system/signature";

export const metadata = { title: "Nova simulação · Tributário" };

export default async function NovaSimulacaoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  try {
    await requireTaxPagePermission(tenantSlug, "tax.simular");
  } catch {
    redirect(`/${tenantSlug}/tributario`);
  }
  return (
    <div className="space-y-4 p-4 sm:p-6" data-tax-simulation-create="">
      <h1 className={gfType.pageTitle}>Nova simulação</h1>
      <TributarioHubNav tenantSlug={tenantSlug} />
      <GFTaxSimulationBuilder />
      <GFTaxVariableEditor />
      <GFTaxAssumptionsPanel
        assumptions={["Informar premissas antes de calcular"]}
        limitations={["mutatesOfficial=false"]}
      />
    </div>
  );
}
