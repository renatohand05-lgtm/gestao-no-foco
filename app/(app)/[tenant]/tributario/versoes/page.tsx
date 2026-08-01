import { redirect } from "next/navigation";
import { TributarioHubNav } from "@/components/tax/tributario-hub-nav";
import { GFTaxRuleVersionDiff } from "@/components/gf/gf-tax-admin";
import { GFSection } from "@/components/gf/gf-section";
import { getTaxVersionsAction } from "@/lib/tax/actions";
import { requireTaxPagePermission } from "@/lib/tax/page-auth";
import { gfType } from "@/lib/design-system/signature";

export const metadata = { title: "Versões · Tributário" };

export default async function VersoesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  let auth;
  try {
    auth = await requireTaxPagePermission(tenantSlug, "tax.versionar");
  } catch {
    try {
      auth = await requireTaxPagePermission(tenantSlug);
    } catch {
      redirect(`/${tenantSlug}/dashboard`);
    }
  }
  const versions = await getTaxVersionsAction(auth.tenant.id);
  return (
    <div className="space-y-4 p-4 sm:p-6" data-tax-versions-page="">
      <h1 className={gfType.pageTitle}>Versionamento</h1>
      <TributarioHubNav tenantSlug={tenantSlug} />
      <GFSection title="Snapshots publicados">
        {!versions.ready ? (
          <p className={gfType.body}>{versions.message}</p>
        ) : versions.rows.length === 0 ? (
          <p className={gfType.body}>
            Nenhum snapshot ainda. Publique uma regra para gerar versão
            imutável.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {versions.rows.map((v) => (
              <li
                key={String(v.id)}
                className="rounded-lg border border-[var(--gf-border-subtle)] p-2"
                data-version-row=""
              >
                regra {String(v.rule_id)} · v{String(v.version)} ·{" "}
                {String(v.change_reason)} · {String(v.created_at)}
              </li>
            ))}
          </ul>
        )}
        <GFTaxRuleVersionDiff
          changedFields={versions.rows.length ? ["status", "version"] : []}
          changeReason="Histórico de publicação"
        />
      </GFSection>
    </div>
  );
}
