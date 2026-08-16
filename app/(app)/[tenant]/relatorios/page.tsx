import Link from "next/link";

import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSegmentUiCopy } from "@/lib/segments/copy.ts";
import {
  hasCapability,
  resolveSegmentContext,
} from "@/lib/segments/resolve.ts";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Relatórios" };

export default async function RelatoriosPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const ctx = resolveSegmentContext({
    segment: tenant.segment,
    segmentVersion: tenant.segment_version,
    segmentConfig: tenant.segment_config,
  });
  const ui = getSegmentUiCopy(ctx);
  const base = `/${tenantSlug}`;

  const links = [
    {
      href: "dashboard",
      title: "Dashboard executivo",
      description:
        "KPIs de faturamento (vendas faturadas, líquido), financeiro, clientes e gráficos do período.",
    },
    {
      href: "analytics",
      title: "Analytics executivo",
      description:
        "Visão consolidada com filtros de período. Domínios em /analytics/* reutilizam o mesmo núcleo.",
    },
    {
      href: "vendas",
      title: "Vendas",
      description: "Listagem e indicadores operacionais de vendas do tenant.",
    },
    {
      href: "financeiro",
      title: "Financeiro",
      description: "Contas a receber/pagar, fluxo e DRE quando disponíveis.",
    },
    {
      href: "financeiro/aging",
      title: "Aging / inadimplência",
      description: "Títulos em aberto e vencidos por faixa (contas a receber).",
    },
    ...(hasCapability(ctx, "inventory")
      ? [
          {
            href: "estoque/dashboard",
            title: "Estoque",
            description: "Posição e alertas de estoque baixo do tenant.",
          },
        ]
      : []),
    ...(hasCapability(ctx, "work_orders")
      ? [
          {
            href: "ordens",
            title: ui.workOrdersReportTitle,
            description: ui.workOrdersReportDescription,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description={`Indicadores reais de ${tenant.name} — sem dados demonstrativos.`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Onde olhar</CardTitle>
          <CardDescription>
            Este hub aponta para módulos com números reconciliáveis. Excel/PDF
            avançados do Analytics permanecem em preparação (feature flags).
            Exportação CSV, quando existir, respeita tenant e permissões.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 sm:grid-cols-2">
            {links.map((item) => (
              <li key={item.href}>
                <Link
                  href={`${base}/${item.href}`}
                  className="block rounded-md border border-border/60 p-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="font-medium text-foreground">
                    {item.title}
                  </span>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
