import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Relatórios" };

export default async function RelatoriosPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description={`Indicadores e análises de ${tenant.name}`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Indicadores</CardTitle>
          <CardDescription>
            Visão consolidada a partir do Dashboard e dos módulos operacionais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use o Dashboard Executivo para acompanhar metas, faturamento e
            prioridades. Relatórios especializados evoluem conforme vendas,
            clientes e financeiro forem registrados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
