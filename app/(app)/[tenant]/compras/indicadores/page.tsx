import { SupplyEnterpriseNavigation } from "@/components/supply/supply-enterprise-navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { gofTypography } from "@/lib/design-system";
import { SUPPLY_KPI_CATALOG } from "@/lib/supply";
import { requireTenant } from "@/lib/tenants";
import { cn } from "@/lib/utils";

export const metadata = { title: "Indicadores Supply" };

export default async function ComprasIndicadoresPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireTenant(tenantSlug);

  return (
    <div className="space-y-6">
      <SupplyEnterpriseNavigation
        tenantSlug={tenantSlug}
        active="compras/indicadores"
      />
      <div>
        <h1 className={cn(gofTypography.title)}>Catálogo de indicadores</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fontes canônicas apenas — KPIs sem fonte aparecem como indisponíveis.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {SUPPLY_KPI_CATALOG.map((kpi) => (
          <Card key={kpi.id}>
            <CardHeader>
              <CardTitle className="text-base">{kpi.name}</CardTitle>
              <CardDescription>{kpi.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <p>Fórmula: {kpi.formula}</p>
              <p>Fonte: {kpi.source}</p>
              <p>
                Disponibilidade: {kpi.availability}
                {kpi.unavailableReason ? ` — ${kpi.unavailableReason}` : ""}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
