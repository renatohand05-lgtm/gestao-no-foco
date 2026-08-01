import { redirect } from "next/navigation";
import { TributarioHubNav } from "@/components/tax/tributario-hub-nav";
import { TaxSimulatorClient } from "@/components/tax/tax-simulator-client";
import { GFSection } from "@/components/gf/gf-section";
import { requireTaxPagePermission } from "@/lib/tax/page-auth";
import { gfType } from "@/lib/design-system/signature";
import Link from "next/link";

export const metadata = { title: "Simulador · Tributário" };

export default async function SimuladorPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  let auth;
  try {
    auth = await requireTaxPagePermission(tenantSlug, "tax.simular");
  } catch {
    try {
      auth = await requireTaxPagePermission(tenantSlug);
    } catch {
      redirect(`/${tenantSlug}/dashboard`);
    }
  }
  return (
    <div className="space-y-4 p-4 sm:p-6" data-tax-simulator-page="">
      <h1 className={gfType.pageTitle}>Simulador tributário</h1>
      <p className={gfType.caption}>
        Isolado do oficial · premissas visíveis · sem mutação de módulos
        financeiros.
      </p>
      <TributarioHubNav tenantSlug={tenantSlug} />
      <div className="flex gap-2 text-sm">
        <Link
          href={`/${tenantSlug}/tributario/simulador/comparar`}
          className="rounded-lg border border-[var(--gf-border-subtle)] px-3 py-1.5"
        >
          Comparar regimes
        </Link>
      </div>
      <GFSection title="Cenários de teste">
        <TaxSimulatorClient
          tenantId={auth.tenant.id}
          userId={auth.profile.id}
        />
      </GFSection>
    </div>
  );
}
