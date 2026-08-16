import {
  ExecutiveHeader,
  ExecutivePage,
} from "@/components/executive";
import { ConnectorsHubClient } from "@/components/import-engine/connectors-hub-client";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { listConnectorDefinitions } from "@/lib/import-engine/connectors/registry";
import { getSegmentUiCopy } from "@/lib/segments/copy.ts";
import {
  hasCapability,
  resolveSegmentContext,
} from "@/lib/segments/resolve.ts";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Conectores Enterprise" };

export default async function ConectoresPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const ctx = resolveSegmentContext({
    segment: tenant.segment,
    segmentVersion: tenant.segment_version,
    segmentConfig: tenant.segment_config,
  });
  const ui = getSegmentUiCopy(ctx);
  const showWorkOrders = hasCapability(ctx, "work_orders");
  const connectors = listConnectorDefinitions()
    .filter((c) => c.id !== "service_orders_channel" || showWorkOrders)
    .map((c) =>
      c.id === "service_orders_channel"
        ? {
            ...c,
            name: ui.connectorsOsName,
            description: `Importação contínua de ${ui.workOrders.toLowerCase()} — em preparação.`,
          }
        : c,
    );

  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs
        items={[
          { label: "Integrações", href: `/${tenantSlug}/integracoes` },
          { label: "Conectores" },
        ]}
      />
      <ExecutiveHeader
        title="Hub de Conectores"
        description={
          showWorkOrders
            ? `Visão dos conectores REST, Webhook, ERP, bancos, vendas e ${ui.workOrders.toLowerCase()} — placeholders claramente em preparação, sem integrações simuladas.`
            : "Visão dos conectores REST, Webhook, ERP, bancos e vendas — placeholders claramente em preparação, sem integrações simuladas."
        }
      />
      <ConnectorsHubClient tenantSlug={tenantSlug} connectors={connectors} />
    </ExecutivePage>
  );
}
