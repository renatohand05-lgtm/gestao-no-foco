import { redirect } from "next/navigation";

import { TributarioHubNav } from "@/components/tax/tributario-hub-nav";
import { TaxRuleCreateForm } from "@/components/tax/tax-rule-workflow-client";
import { GFSection } from "@/components/gf/gf-section";
import { requireTaxPagePermission } from "@/lib/tax/page-auth";
import { gfType } from "@/lib/design-system/signature";

export const metadata = { title: "Nova regra · Tributário" };

export default async function NovaRegraPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  let auth;
  try {
    auth = await requireTaxPagePermission(tenantSlug, "tax.criar_regra");
  } catch {
    try {
      auth = await requireTaxPagePermission(tenantSlug, "tax.configurar");
    } catch {
      redirect(`/${tenantSlug}/tributario`);
    }
  }

  return (
    <div className="space-y-4 p-4 sm:p-6" data-tax-rule-create-page="">
      <h1 className={gfType.pageTitle}>Nova regra (draft)</h1>
      <p className={gfType.caption}>
        Homologação · marcação [TESTE] · sem alíquota legal oficial.
      </p>
      <TributarioHubNav tenantSlug={tenantSlug} />
      <GFSection title="Formulário">
        <TaxRuleCreateForm
          tenantId={auth.tenant.id}
          tenantSlug={tenantSlug}
          userId={auth.profile.id}
        />
      </GFSection>
    </div>
  );
}
