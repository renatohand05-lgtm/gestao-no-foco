import { redirect } from "next/navigation";
import { TributarioHubNav } from "@/components/tax/tributario-hub-nav";
import { GFTaxCalendarList } from "@/components/gf/gf-tax-executive";
import { GFSection } from "@/components/gf/gf-section";
import { requireTaxPagePermission } from "@/lib/tax/page-auth";
import { gfType } from "@/lib/design-system/signature";

export const metadata = { title: "Obrigações · Tributário" };

export default async function ObrigacoesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  try {
    await requireTaxPagePermission(tenantSlug);
  } catch {
    redirect(`/${tenantSlug}/dashboard`);
  }
  return (
    <div className="space-y-4 p-4 sm:p-6" data-tax-obligations-page="">
      <h1 className={gfType.pageTitle}>Obrigações</h1>
      <TributarioHubNav tenantSlug={tenantSlug} />
      <GFSection
        title="Definições"
        description="Sem fonte configurada, calendário mostra indisponível — nada inventado."
      >
        <GFTaxCalendarList items={[]} />
      </GFSection>
    </div>
  );
}
