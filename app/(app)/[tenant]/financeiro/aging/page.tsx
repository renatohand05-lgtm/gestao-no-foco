import { FinanceFeatureLocked } from "@/components/finance/finance-feature-locked";
import { FinancePageHeader } from "@/components/finance/finance-page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isFinanceFeatureUnlocked } from "@/lib/billing/finance-entitlement";
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
import { createClient } from "@/lib/supabase/server";

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

  const client = await createClient();
  const unlocked = await isFinanceFeatureUnlocked(
    client,
    auth.tenant.id,
    "analytics_bi",
  );
  if (!unlocked) {
    return (
      <div className="space-y-4 p-4 sm:p-6" data-phase28="finance-aging">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          title="Aging / Inadimplência"
        />
        <FinanceFeatureLocked
          tenantSlug={tenantSlug}
          feature="analytics_bi"
          title="Aging / Inadimplência"
        />
      </div>
    );
  }

  const hoje = civilDateInTimezone(new Date(), DEFAULT_TENANT_TIMEZONE);
  const cr = await createContaReceberService(auth.tenant.id);

  // Sprint 34.7 — aging precisa de todos os títulos abertos/vencidos (não só 1 página).
  const MAX_AGING_PAGES = 40; // 40 × 50 = 2000 títulos
  const titulos: Array<{
    id: string;
    clienteId: string | null;
    clienteNome: string | null;
    valor: number;
    dataVencimento: string;
    status: string;
  }> = [];
  let truncated = false;
  let page = 1;
  let totalPages = 1;
  do {
    const list = await cr.list({
      page,
      perPage: 50,
      status: "all",
      sort: "data_vencimento",
      order: "asc",
    });
    totalPages = list.totalPages;
    for (const i of list.data) {
      if (i.status_exibicao !== "aberto" && i.status_exibicao !== "vencido") {
        continue;
      }
      titulos.push({
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
      });
    }
    page += 1;
  } while (page <= totalPages && page <= MAX_AGING_PAGES);

  if (totalPages > MAX_AGING_PAGES) {
    truncated = true;
  }
  const report = buildAgingReport(titulos, hoje);

  return (
    <div className="space-y-4 p-4 sm:p-6" data-phase28="finance-aging">
      <FinancePageHeader
        tenantSlug={tenantSlug}
        tenantName={auth.tenant.name}
        title="Aging / Inadimplência"
        description={`Referência ${hoje} · contas a receber em aberto/vencido. Sem conciliação automática.`}
      />

      {truncated ? (
        <p
          className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100"
          role="status"
        >
          Totais limitados aos primeiros {MAX_AGING_PAGES * 50} títulos abertos.
          Refine o cadastro ou use a listagem de contas a receber para o restante.
        </p>
      ) : null}

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
