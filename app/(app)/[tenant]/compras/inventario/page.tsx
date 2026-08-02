import { InventoryCyclesClient } from "@/components/supply/inventory-cycles-client";
import { SupplyEnterpriseNavigation } from "@/components/supply/supply-enterprise-navigation";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { gofTypography } from "@/lib/design-system";
import { listSupplyInventoryCyclesAction } from "@/lib/supply/supply-enterprise-actions";
import { requireTenant } from "@/lib/tenants";
import { cn } from "@/lib/utils";

export const metadata = { title: "Inventário Enterprise" };

export default async function ComprasInventarioPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireTenant(tenantSlug);

  let ready: boolean | null = null;
  let rows: Awaited<
    ReturnType<typeof listSupplyInventoryCyclesAction>
  >["rows"] = [];
  let error: string | null = null;

  try {
    const res = await listSupplyInventoryCyclesAction(tenantSlug);
    ready = res.ready;
    rows = res.rows;
  } catch (e) {
    error = e instanceof Error ? e.message : "Falha ao listar inventários";
  }

  return (
    <div className="space-y-6">
      <SupplyEnterpriseNavigation
        tenantSlug={tenantSlug}
        active="compras/inventario"
      />
      <div>
        <h1 className={cn(gofTypography.title)}>Inventário</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ciclos rotativos e gerais com conferência, divergências, ajustes e
          auditoria.
        </p>
      </div>

      {ready === false ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schema pendente</CardTitle>
            <CardDescription>
              Aplique a migration 20260813 para inventários persistidos. Ajustes
              pontuais continuam em{" "}
              <code>/{tenantSlug}/estoque/nova-movimentacao</code>.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <InventoryCyclesClient
        tenantSlug={tenantSlug}
        ready={ready === true}
        initialRows={rows.map((c) => ({
          id: c.id,
          kind: c.kind,
          status: c.status,
          created_at: c.created_at,
        }))}
      />
    </div>
  );
}
