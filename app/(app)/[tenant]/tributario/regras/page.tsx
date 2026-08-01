import Link from "next/link";
import { redirect } from "next/navigation";

import { TributarioHubNav } from "@/components/tax/tributario-hub-nav";
import { GFTaxRuleTable } from "@/components/gf/gf-tax-admin";
import { GFSection } from "@/components/gf/gf-section";
import { listTaxRulesAction } from "@/lib/tax/actions";
import { requireTaxPagePermission } from "@/lib/tax/page-auth";
import { gfType } from "@/lib/design-system/signature";

export const metadata = { title: "Regras · Tributário" };

export default async function TributarioRegrasPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  let auth;
  try {
    auth = await requireTaxPagePermission(tenantSlug, "tax.visualizar");
  } catch {
    redirect(`/${tenantSlug}/dashboard`);
  }

  const listed = await listTaxRulesAction(auth.tenant.id);

  return (
    <div className="space-y-4 p-4 sm:p-6" data-tax-rules-page="">
      <h1 className={gfType.pageTitle}>Regras tributárias</h1>
      <TributarioHubNav tenantSlug={tenantSlug} />
      <div className="flex gap-2">
        <Link
          href={`/${tenantSlug}/tributario/regras/nova`}
          className="rounded-lg border border-[var(--gf-border-subtle)] px-3 py-1.5 text-sm"
          data-new-rule-link=""
        >
          Nova regra (draft)
        </Link>
        <Link
          href={`/${tenantSlug}/tributario/regras?diagnose=1`}
          className="rounded-lg border border-[var(--gf-border-subtle)] px-3 py-1.5 text-sm"
        >
          Diagnóstico de precedência
        </Link>
      </div>
      <GFSection
        title="Lista"
        description={
          listed.ready
            ? `${listed.rules.length} regra(s) · persistência ativa`
            : listed.message
        }
      >
        <GFTaxRuleTable
          rules={listed.rules.map((r) => ({
            id: r.id,
            code: r.code,
            name: r.name,
            status: r.status,
            version: r.version,
            validFrom: r.validFrom,
            sourceReference: r.sourceReference,
          }))}
          tenantSlug={tenantSlug}
        />
      </GFSection>
    </div>
  );
}
