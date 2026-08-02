import Link from "next/link";

import { FinancePageHeader } from "@/components/finance/finance-page-header";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCashIntelligenceDashboard } from "@/lib/finance/cash-intelligence/cash-intelligence-actions";
import { buildAgingReport } from "@/lib/finance/aging/aging";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";
import { createContaReceberService } from "@/lib/financeiro/conta-receber-service";
import { formatCurrency } from "@/lib/format";
import {
  civilDateInTimezone,
  DEFAULT_TENANT_TIMEZONE,
} from "@/lib/dashboard/tenant-timezone";

export const metadata = { title: "Dashboard CFO" };
export const dynamic = "force-dynamic";

export default async function FinanceiroCfoPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  let auth;
  try {
    auth = await requireFinancePagePermission(tenantSlug, [
      "financeiro.cfo.visualizar",
      "financeiro.visualizar",
    ]);
  } catch (error) {
    const err = financePageAuthError(error);
    return (
      <div className="space-y-4 p-4 sm:p-6" data-phase28="finance-cfo">
        <FinancePageHeader
          tenantSlug={tenantSlug}
          title="Dashboard CFO"
          description={err.message}
        />
      </div>
    );
  }

  const hoje = civilDateInTimezone(new Date(), DEFAULT_TENANT_TIMEZONE);

  const cashPromise = getCashIntelligenceDashboard(tenantSlug, {
    horizonDays: 30,
  });

  const agingPromise = (async () => {
    try {
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
      return buildAgingReport(titulos, hoje);
    } catch {
      return null;
    }
  })();

  const [cashRes, aging] = await Promise.all([cashPromise, agingPromise]);

  const agingTotalVencido = aging?.totalVencido ?? 0;
  const agingTotalAVencer = aging?.totalAVencer ?? 0;

  const saldo = cashRes.success
    ? cashRes.dashboard.balance.consolidated
    : null;
  const capitalGiro = cashRes.success
    ? cashRes.dashboard.workingCapital.recommended
    : null;

  return (
    <div className="space-y-4 p-4 sm:p-6" data-phase28="finance-cfo">
      <FinancePageHeader
        tenantSlug={tenantSlug}
        tenantName={auth.tenant.name}
        title="Dashboard CFO"
        description="Saldo, projeção, inadimplência e atalhos — reutiliza engines canônicos de caixa e DRE."
      />

      {!cashRes.success ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Caixa: {cashRes.error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          title="Saldo consolidado"
          value={saldo == null ? "—" : formatCurrency(saldo)}
        />
        <Metric
          title="Capital de giro"
          value={capitalGiro == null ? "—" : formatCurrency(capitalGiro)}
        />
        <Metric
          title="A receber vencido"
          value={formatCurrency(agingTotalVencido)}
        />
        <Metric
          title="A receber a vencer"
          value={formatCurrency(agingTotalAVencer)}
        />
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <NavChip href={`/${tenantSlug}/financeiro/caixa`} label="Caixa & projeção" />
        <NavChip href={`/${tenantSlug}/financeiro/fluxo-caixa`} label="Fluxo" />
        <NavChip href={`/${tenantSlug}/financeiro/dre`} label="DRE" />
        <NavChip href={`/${tenantSlug}/financeiro/aging`} label="Aging" />
        <NavChip href={`/${tenantSlug}/financeiro/orcamento`} label="Orçamento" />
        <NavChip
          href={`/${tenantSlug}/financeiro/conciliacao`}
          label="Conciliação"
        />
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

function NavChip({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md border px-3 py-1.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {label}
    </Link>
  );
}
