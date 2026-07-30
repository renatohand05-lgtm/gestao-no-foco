import { CrmEnterpriseNavigation } from "@/components/crm/crm-enterprise-navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  describeCrmIntegrationArchitecture,
  getCrmFeatureFlags,
} from "@/lib/crm";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Integrações CRM" };

export default async function CrmIntegracoesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireTenant(tenantSlug);
  const architecture = describeCrmIntegrationArchitecture();
  const flags = getCrmFeatureFlags();

  return (
    <div className="space-y-6">
      <CrmEnterpriseNavigation tenantSlug={tenantSlug} active="crm/integracoes" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrações CRM</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Arquitetura somente — nenhum serviço externo conectado nesta fase.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Princípio</CardTitle>
          <CardDescription>v{architecture.version}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>{architecture.principle}</p>
          <ul className="list-inside list-disc text-muted-foreground">
            {architecture.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="outline">
              enterprise: {flags.enterprise ? "on" : "off"}
            </Badge>
            <Badge variant="outline">
              integrações: {flags.externalIntegrations ? "on" : "off"}
            </Badge>
            <Badge variant="outline">
              IA externa: {flags.externalAi ? "on" : "off"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {architecture.connectors.map((c) => (
          <Card key={c.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{c.name}</CardTitle>
              <CardDescription>
                {c.category} · {c.id}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Badge variant="secondary">
                {c.status === "preparing" ? "Em preparação" : "Desabilitado"}
              </Badge>
              <p className="text-muted-foreground">{c.description}</p>
              <p className="text-xs">Flag: {c.featureFlag}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
