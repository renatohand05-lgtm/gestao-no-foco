import { PageHeader } from "@/components/dashboard/page-header";
import { DreClassificacaoIncompleta } from "@/components/financeiro/dre-classificacao-incompleta";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listDreClassificacaoIncompleta } from "@/lib/financeiro/dre-classificacao-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Relatórios" };

export default async function RelatoriosPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const classificacaoIncompleta = await listDreClassificacaoIncompleta(tenant.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description={`Indicadores e análises de ${tenant.name}`}
      />

      <DreClassificacaoIncompleta
        tenantSlug={tenantSlug}
        lancamentos={classificacaoIncompleta}
      />

      <Card>
        <CardHeader>
          <CardTitle>Indicadores</CardTitle>
          <CardDescription>
            Dashboards e exportações em desenvolvimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Os relatórios serão alimentados conforme você registrar vendas,
            clientes e movimentações financeiras.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
