import { SupplyEnterpriseNavigation } from "@/components/supply/supply-enterprise-navigation";
import { WarehouseDepositosClient } from "@/components/supply/warehouse-depositos-client";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { gofTypography } from "@/lib/design-system";
import { listSupplyDepositosAction } from "@/lib/supply/supply-enterprise-actions";
import { requireTenant } from "@/lib/tenants";
import { cn } from "@/lib/utils";

export const metadata = { title: "Almoxarifado Enterprise" };

export default async function ComprasAlmoxarifadoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  await requireTenant(tenantSlug);

  let ready: boolean | null = null;
  let rows: Awaited<ReturnType<typeof listSupplyDepositosAction>>["rows"] = [];
  let error: string | null = null;

  try {
    const res = await listSupplyDepositosAction(tenantSlug);
    ready = res.ready;
    rows = res.rows;
  } catch (e) {
    error = e instanceof Error ? e.message : "Falha ao listar depósitos";
  }

  return (
    <div className="space-y-6">
      <SupplyEnterpriseNavigation
        tenantSlug={tenantSlug}
        active="compras/almoxarifado"
      />
      <div>
        <h1 className={cn(gofTypography.title)}>Almoxarifado</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Depósitos, almoxarifados e localizações (rua / corredor / prateleira /
          posição) — multiempresa e multifilial.
        </p>
      </div>

      {ready === false ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schema pendente</CardTitle>
            <CardDescription>
              Aplique <code>20260813_supply_chain_enterprise_fase25.sql</code>{" "}
              para persistir depósitos. Localização textual em produtos continua
              disponível no catálogo atual.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <WarehouseDepositosClient
        tenantSlug={tenantSlug}
        ready={ready === true}
        initialRows={rows.map((d) => ({
          id: d.id,
          nome: d.nome,
          codigo: d.codigo,
          ativo: Boolean(d.ativo),
        }))}
      />
    </div>
  );
}
