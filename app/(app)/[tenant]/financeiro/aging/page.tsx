import { FinancePageHeader } from "@/components/finance/finance-page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  civilDateInTimezone,
  DEFAULT_TENANT_TIMEZONE,
} from "@/lib/dashboard/tenant-timezone";
import { buildAgingReport } from "@/lib/finance/aging/aging";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";
import { createContaReceberService } from "@/lib/financeiro/conta-receber-service";
import { formatCurrency } from "@/lib/format";

export const metadata = { title: "Aging / Inadimplência" };
export const dynamic = "force-dynamic";

export default async function FinanceiroAgingPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  let auth;
  try {
    auth = await requireFinancePagePermission(tenantSlug, [
      "financeiro.aging.visualizar",
      "financeiro.visualizar",
    ]);
  } catch (error) {
    const err = financePageAuthError(error);
    return (
      <div className="space-y-4 p-4 sm:p-6" data-phase28="finance-aging">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          title="Aging / Inadimplência"
          description={err.message}
        />
      </div>
    );
  }

  const hoje = civilDateInTimezone(new Date(), DEFAULT_TENANT_TIMEZONE);
  const cr = await createContaReceberService(auth.tenant.id);
  const list = await cr.list({
    page: 1,
    perPage: 50,
    status: "all",
    sort: "data_vencimento",
    order: "asc",
  });

  const titulos = list.data
    .filter(
      (i) =>
        i.status_exibicao === "aberto" || i.status_exibicao === "vencido",
    )
    .map((i) => ({
      id: i.id,
      clienteId: i.cliente_id,
      clienteNome: i.cliente?.nome ?? null,
      valor: Math.max(
        Number(i.valor_original ?? 0) +
          Number(i.juros ?? 0) +
          Number(i.multa ?? 0) -
          Number(i.desconto ?? 0) -
          Number(i.valor_recebido ?? 0),
        0,
      ),
      dataVencimento: i.data_vencimento,
      status: i.status_exibicao,
    }));

  const report = buildAgingReport(titulos, hoje);

  return (
    <div className="space-y-4 p-4 sm:p-6" data-phase28="finance-aging">
      <FinancePageHeader
        tenantSlug={tenantSlug}
        tenantName={auth.tenant.name}
        title="Aging / Inadimplência"
        description={`Referência ${hoje} · contas a receber em aberto/vencido. Sem conciliação automática.`}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric title="Total geral" value={formatCurrency(report.totalGeral)} />
        <Metric
          title="Vencido"
          value={formatCurrency(report.totalVencido)}
        />
        <Metric
          title="A vencer"
          value={formatCurrency(report.totalAVencer)}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {report.buckets.map((b) => (
          <Card key={b.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{b.label}</CardTitle>
              <CardDescription>
                {b.quantidade} título(s) · {formatCurrency(b.valor)}
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-48 space-y-1 overflow-y-auto text-sm">
              {b.titulos.length === 0 ? (
                <p className="text-muted-foreground">Vazio</p>
              ) : (
                b.titulos.slice(0, 12).map((t) => (
                  <div
                    key={t.id}
                    className="flex justify-between gap-2 border-b border-border/40 py-1 last:border-0"
                  >
                    <span className="truncate">
                      {t.clienteNome ?? "Cliente"}
                    </span>
                    <span className="tabular-nums shrink-0">
                      {formatCurrency(t.valor)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
