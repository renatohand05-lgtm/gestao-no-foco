import { SupplyEnterpriseNavigation } from "@/components/supply/supply-enterprise-navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { gofTypography } from "@/lib/design-system";
import { createClient } from "@/lib/supabase/server";
import { SUPPLY_KPI_CATALOG } from "@/lib/supply";
import { requireTenant } from "@/lib/tenants";
import { cn } from "@/lib/utils";

export const metadata = { title: "Indicadores Supply" };
export const dynamic = "force-dynamic";

export default async function ComprasIndicadoresPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const supabase = await createClient();

  let pedidosAbertos = 0;
  let emCotacao = 0;
  let liveNote: string | null = null;
  const ped = await supabase
    .from("compras_pedidos" as never)
    .select("id, status")
    .eq("tenant_id", tenant.id)
    .is("deleted_at", null)
    .limit(500);
  if (ped.error) {
    liveNote = ped.error.message;
  } else {
    const rows = (ped.data ?? []) as Array<{ status?: string }>;
    pedidosAbertos = rows.filter((r) =>
      ["rascunho", "enviada", "em_cotacao", "aprovada", "cotacao", "comparacao", "pedido"].includes(
        String(r.status ?? ""),
      ),
    ).length;
    emCotacao = rows.filter((r) =>
      ["em_cotacao", "cotacao", "comparacao"].includes(String(r.status ?? "")),
    ).length;
  }

  return (
    <div className="space-y-6" data-phase28="compras-indicadores">
      <SupplyEnterpriseNavigation
        tenantSlug={tenantSlug}
        active="compras/indicadores"
      />
      <div>
        <h1 className={cn(gofTypography.title)}>Indicadores de compras</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Contagens ao vivo + catálogo canônico. Economia/lead time avançados na
          28.7.
        </p>
        {liveNote ? (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            Pedidos: {liveNote}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Pedidos em ciclo aberto</CardDescription>
            <CardTitle className="text-xl tabular-nums">
              {pedidosAbertos}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Em cotação / comparação</CardDescription>
            <CardTitle className="text-xl tabular-nums">{emCotacao}</CardTitle>
          </CardHeader>
        </Card>
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
