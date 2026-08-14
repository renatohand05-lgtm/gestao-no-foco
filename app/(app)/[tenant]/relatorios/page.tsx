import Link from "next/link";

import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Relatórios" };

const LINKS = [
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
  {
    href: "estoque/dashboard",
    title: "Estoque",
    description: "Posição e alertas de estoque baixo do tenant.",
  },
  {
    href: "ordens",
    title: "Ordens de serviço",
    description: "OS por status e valores quando o módulo estiver em uso.",
  },
] as const;

export default async function RelatoriosPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const base = `/${tenantSlug}`;

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
            {LINKS.map((item) => (
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
