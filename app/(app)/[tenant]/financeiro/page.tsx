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

export const metadata = { title: "Financeiro" };

export default async function FinanceiroPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description={`Fluxo de caixa e contas de ${tenant.name}`}
      >
        <Button>Nova movimentação</Button>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contas a receber</CardTitle>
            <CardDescription>Valores pendentes de clientes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">R$ 0,00</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Contas a pagar</CardTitle>
            <CardDescription>Obrigações pendentes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">R$ 0,00</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
