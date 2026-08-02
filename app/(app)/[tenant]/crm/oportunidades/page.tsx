import Link from "next/link";

import { ConvertOppToOrcamentoButton } from "@/components/crm/convert-opp-orcamento-button";
import { CrmEnterpriseNavigation } from "@/components/crm/crm-enterprise-navigation";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createCrmOportunidadeService } from "@/lib/crm/enterprise/oportunidade-service";
import { formatCurrency, formatPercent } from "@/lib/format";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "CRM · Oportunidades" };
export const dynamic = "force-dynamic";

export default async function CrmOportunidadesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);

  let rows: Awaited<
    ReturnType<
      Awaited<ReturnType<typeof createCrmOportunidadeService>>["listAll"]
    >
  > = [];
  let errorMsg: string | null = null;
  try {
    const svc = await createCrmOportunidadeService(tenant.id);
    rows = await svc.listAll();
  } catch (e) {
    errorMsg = e instanceof Error ? e.message : "Indisponível";
  }

  const abertas = rows.filter((r) => r.status === "aberta");
  const pipelineValor = abertas.reduce(
    (s, r) => s + (Number(r.valor_estimado) || 0),
    0,
  );
  const ganhas = rows.filter((r) => r.status === "ganha").length;
  const perdidas = rows.filter((r) => r.status === "perdida").length;

  return (
    <div className="space-y-6" data-phase28="crm-oportunidades">
      <CrmEnterpriseNavigation
        tenantSlug={tenantSlug}
        active="crm/oportunidades"
      />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Oportunidades</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fonte: `crm_oportunidades` · conversão sem duplicar cliente.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi title="Abertas" value={String(abertas.length)} />
        <Kpi title="Valor pipeline" value={formatCurrency(pipelineValor)} />
        <Kpi title="Ganhas" value={String(ganhas)} />
        <Kpi title="Perdidas" value={String(perdidas)} />
      </div>

      {errorMsg ? (
        <Card>
          <CardHeader>
            <CardTitle>Indisponível</CardTitle>
            <CardDescription>{errorMsg}</CardDescription>
          </CardHeader>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma oportunidade</CardTitle>
            <CardDescription>
              Crie oportunidades a partir do cliente 360 ou ações CRM.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={`/${tenantSlug}/clientes`}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Abrir cadastro de clientes
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Título</th>
                <th className="px-3 py-2">Etapa</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Valor</th>
                <th className="px-3 py-2">Prob.</th>
                <th className="px-3 py-2">Previsão</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Ação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{row.titulo}</td>
                  <td className="px-3 py-2">
                    <Badge variant="outline">{row.stage_key}</Badge>
                  </td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {row.valor_estimado != null
                      ? formatCurrency(Number(row.valor_estimado))
                      : "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {row.probabilidade != null
                      ? formatPercent(Number(row.probabilidade))
                      : "—"}
                  </td>
                  <td className="px-3 py-2">{row.data_prevista ?? "—"}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/${tenantSlug}/clientes/${row.cliente_id}`}
                      className="text-primary hover:underline"
                    >
                      Abrir
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    {row.status === "aberta" ? (
                      <ConvertOppToOrcamentoButton
                        tenantSlug={tenantSlug}
                        oportunidadeId={row.id}
                        titulo={row.titulo}
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
