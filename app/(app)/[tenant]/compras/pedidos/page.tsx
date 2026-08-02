import Link from "next/link";

import { PurchaseOrdersClient } from "@/components/supply/purchase-orders-client";
import { SupplyEnterpriseNavigation } from "@/components/supply/supply-enterprise-navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { gofTypography } from "@/lib/design-system";
import { listSupplyPurchaseOrdersAction } from "@/lib/supply/supply-enterprise-actions";
import { requireTenant } from "@/lib/tenants";
import { cn } from "@/lib/utils";

export const metadata = { title: "Pedidos de compra" };

export default async function ComprasPedidosPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireTenant(tenantSlug);

  let ready: boolean | null = null;
  let rows: Awaited<ReturnType<typeof listSupplyPurchaseOrdersAction>>["rows"] =
    [];
  let error: string | null = null;

  try {
    const res = await listSupplyPurchaseOrdersAction(tenantSlug);
    ready = res.ready;
    rows = res.rows;
  } catch (e) {
    error = e instanceof Error ? e.message : "Falha ao listar pedidos";
  }

  return (
    <div className="space-y-6">
      <SupplyEnterpriseNavigation
        tenantSlug={tenantSlug}
        active="compras/pedidos"
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={cn(gofTypography.title)}>Pedidos de compra</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Workflow: solicitação → aprovação → cotação → pedido → recebimento →
            integração Finance/Estoque (sem falso sucesso).
          </p>
        </div>
        <Link href={`/${tenantSlug}/estoque/notas-fiscais`}>
          <Button type="button" variant="outline">
            NF-e de entrada
          </Button>
        </Link>
      </div>

      {ready === false ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schema pendente</CardTitle>
            <CardDescription>
              Aplique a migration{" "}
              <code>20260813_supply_chain_enterprise_fase25.sql</code> para
              ativar pedidos persistidos.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <PurchaseOrdersClient
          tenantSlug={tenantSlug}
          ready={ready === true}
          initialRows={rows.map((r) => ({
            id: r.id,
            status: r.status,
            numero: r.numero,
            valor_total: r.valor_total,
            created_at: r.created_at,
          }))}
        />
      )}
    </div>
  );
}
