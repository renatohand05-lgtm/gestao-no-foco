import { SupplyEnterpriseNavigation } from "@/components/supply/supply-enterprise-navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { gofTypography } from "@/lib/design-system";
import {
  describeSupplyIntegrationArchitecture,
  getSupplyFeatureFlags,
  resolveSupplyProvider,
} from "@/lib/supply";
import { requireTenant } from "@/lib/tenants";
import { cn } from "@/lib/utils";

export const metadata = { title: "Inteligência Supply" };

export default async function ComprasInteligenciaPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireTenant(tenantSlug);

  const flags = getSupplyFeatureFlags();
  const provider = resolveSupplyProvider();
  const arch = describeSupplyIntegrationArchitecture();

  return (
    <div className="space-y-6">
      <SupplyEnterpriseNavigation
        tenantSlug={tenantSlug}
        active="compras/inteligencia"
      />
      <div>
        <h1 className={cn(gofTypography.title)}>Inteligência de Supply Chain</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Provider determinístico — nunca inventa dados. Integrações externas
          permanecem desligadas por padrão.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provider ativo</CardTitle>
          <CardDescription>
            {provider.label} · {provider.kind}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Flags: enterprise={String(flags.enterprise)} · externalAi=
          {String(flags.externalAi)} · externalIntegrations=
          {String(flags.externalIntegrations)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pontes de integração</CardTitle>
          <CardDescription>{arch.principle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {arch.bridges.map((b) => (
            <div key={b.id} className="border-b py-2 text-sm">
              <div className="font-medium">
                {b.target} · {b.status}
              </div>
              <p className="text-muted-foreground">{b.description}</p>
              <p className="text-xs text-muted-foreground">{b.reusePath}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
