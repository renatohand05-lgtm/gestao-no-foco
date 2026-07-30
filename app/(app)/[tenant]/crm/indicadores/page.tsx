import { CrmEnterpriseNavigation } from "@/components/crm/crm-enterprise-navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CRM_KPI_CATALOG } from "@/lib/crm";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Indicadores CRM" };

export default async function CrmIndicadoresPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireTenant(tenantSlug);

  return (
    <div className="space-y-6">
      <CrmEnterpriseNavigation tenantSlug={tenantSlug} active="crm/indicadores" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Indicadores CRM</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Catálogo com fontes canônicas. KPIs sem fonte confiável permanecem
          indisponíveis.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {CRM_KPI_CATALOG.map((k) => (
          <Card key={k.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{k.name}</CardTitle>
              <CardDescription>{k.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">{k.unit}</Badge>
                <Badge
                  variant={
                    k.availability === "available" ? "default" : "secondary"
                  }
                >
                  {k.availability}
                </Badge>
                {k.drillDownAvailable ? (
                  <Badge variant="outline">drill-down</Badge>
                ) : null}
              </div>
              <p>
                <span className="text-muted-foreground">Fórmula:</span> {k.formula}
              </p>
              <p>
                <span className="text-muted-foreground">Fonte:</span> {k.source}
              </p>
              {k.unavailableReason ? (
                <p className="text-amber-800">{k.unavailableReason}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
