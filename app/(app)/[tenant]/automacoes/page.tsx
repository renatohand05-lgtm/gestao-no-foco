import { AutomacoesCentral } from "@/components/automacoes/automacoes-central";
import { getAutomacoesCentralAction } from "@/lib/automacoes/actions";
import { getAutomationSegmentCopy } from "@/lib/automacoes/multisector";
import { requireTenant } from "@/lib/tenants";

export const metadata = {
  title: "Automações",
  description: "Central de Automações Enterprise",
};

export default async function AutomacoesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  let tenant;
  try {
    tenant = await requireTenant(tenantSlug);
  } catch {
    return (
      <div className="space-y-4 p-4 sm:p-6" data-automacoes-page="auth">
        <h1 className="text-xl font-semibold">Central de Automações</h1>
        <p className="text-sm text-destructive" role="alert">
          Sessão ou tenant indisponível.
        </p>
      </div>
    );
  }

  const res = await getAutomacoesCentralAction(tenantSlug);
  const copy = getAutomationSegmentCopy(tenant.segment);

  if (!res.success) {
    return (
      <div className="space-y-4 p-4 sm:p-6" data-automacoes-page="error">
        <h1 className="text-xl font-semibold">Central de Automações</h1>
        <p className="text-sm text-destructive" role="alert">
          {res.error}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6" data-automacoes-page="ok">
      <AutomacoesCentral
        tenantSlug={tenantSlug}
        initialSnapshot={res.snapshot}
        templates={[...res.templates]}
        triggers={res.triggers}
        allowedActions={res.allowedActions}
        blockedActions={[...res.blockedActions]}
        probeMessage={res.probe.message}
        segmentTitle={copy.title}
        segmentHighlights={copy.highlights}
      />
    </div>
  );
}
