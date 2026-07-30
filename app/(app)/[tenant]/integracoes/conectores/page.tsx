import {
  ExecutiveHeader,
  ExecutivePage,
} from "@/components/executive";
import { ConnectorsHubClient } from "@/components/import-engine/connectors-hub-client";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { listConnectorDefinitions } from "@/lib/import-engine/connectors/registry";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Conectores Enterprise" };

export default async function ConectoresPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireTenant(tenantSlug);

  const connectors = listConnectorDefinitions();

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
        description="Visão dos conectores REST, Webhook, ERP, bancos, vendas e OS — placeholders claramente em preparação, sem integrações simuladas."
      />
      <ConnectorsHubClient tenantSlug={tenantSlug} connectors={connectors} />
    </ExecutivePage>
  );
}
