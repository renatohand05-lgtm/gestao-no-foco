import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Ordens de Serviço" };

export default async function OrdensPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ordens de Serviço"
        description={`Controle operacional de ${tenant.name}`}
      >
        <Button>Nova ordem</Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Ordens em andamento</CardTitle>
          <CardDescription>
            Ideal para oficinas, assistências e prestadores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Nenhuma ordem de serviço aberta. Crie uma ordem para acompanhar
            status, peças e entrega.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
