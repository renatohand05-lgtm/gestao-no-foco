import { redirect } from "next/navigation";
import { TributarioHubNav } from "@/components/tax/tributario-hub-nav";
import { GFSection } from "@/components/gf/gf-section";
import { requireTaxPagePermission } from "@/lib/tax/page-auth";
import { getTaxAdminFeatureFlags } from "@/lib/tax/feature-flags";
import { listIntegrationProviders } from "@/lib/tax/executive";
import { gfType } from "@/lib/design-system/signature";

export const metadata = { title: "Configurações · Tributário" };

export default async function TaxConfigPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  try {
    await requireTaxPagePermission(tenantSlug, "tax.configurar");
  } catch {
    try {
      await requireTaxPagePermission(tenantSlug);
    } catch {
      redirect(`/${tenantSlug}/dashboard`);
    }
  }
  const flags = getTaxAdminFeatureFlags();
  const providers = listIntegrationProviders();

  return (
    <div className="space-y-4 p-4 sm:p-6" data-tax-config-page="">
      <h1 className={gfType.pageTitle}>Configurações tributárias</h1>
      <TributarioHubNav tenantSlug={tenantSlug} />
      <GFSection title="Flags">
        <pre className="overflow-auto rounded-xl border border-border p-3 text-xs">
          {JSON.stringify(flags, null, 2)}
        </pre>
      </GFSection>
      <GFSection
        title="Integrações fiscais (futuro)"
        description="Nenhum provider ativo sem credencial real."
      >
        <ul className="space-y-2 text-sm">
          {providers.map((p) => (
            <li
              key={p.id}
              data-integration-status={p.status}
              className="rounded-lg border border-[var(--gf-border-subtle)] p-2"
            >
              {p.name} · {p.status} · credencial{" "}
              {p.hasRealCredentials ? "sim" : "não"}
            </li>
          ))}
        </ul>
      </GFSection>
      <p className={gfType.caption}>
        Ambientes: configuração · simulação · produção. Draft nunca afeta
        cálculo oficial.
      </p>
    </div>
  );
}
