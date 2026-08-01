import { redirect } from "next/navigation";

import { TributarioHubNav } from "@/components/tax/tributario-hub-nav";
import { TaxRuleWorkflowPanel } from "@/components/tax/tax-rule-workflow-client";
import { GFSection } from "@/components/gf/gf-section";
import { getTaxRuleAction } from "@/lib/tax/actions";
import { requireTaxPagePermission } from "@/lib/tax/page-auth";
import { gfType } from "@/lib/design-system/signature";

export const metadata = { title: "Regra · Tributário" };

export default async function RegraDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant: tenantSlug, id } = await params;
  let auth;
  try {
    auth = await requireTaxPagePermission(tenantSlug, "tax.visualizar");
  } catch {
    redirect(`/${tenantSlug}/dashboard`);
  }

  const detail = await getTaxRuleAction(auth.tenant.id, id);

  return (
    <div
      className="space-y-4 p-4 sm:p-6"
      data-tax-rule-detail-page=""
      data-rule-id={id}
    >
      <h1 className={gfType.pageTitle}>
        {detail.rule ? detail.rule.name : `Regra ${id}`}
      </h1>
      <TributarioHubNav tenantSlug={tenantSlug} />
      {!detail.rule ? (
        <p className={gfType.body}>{detail.message || "Regra não encontrada"}</p>
      ) : (
        <GFSection title="Workflow">
          <TaxRuleWorkflowPanel
            tenantId={auth.tenant.id}
            tenantSlug={tenantSlug}
            userId={auth.profile.id}
            rule={detail.rule}
          />
        </GFSection>
      )}
    </div>
  );
}
