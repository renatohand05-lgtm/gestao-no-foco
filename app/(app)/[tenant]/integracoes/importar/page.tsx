import Link from "next/link";
import { ShoppingCart, Wallet, Wrench } from "lucide-react";

import { ExecutiveHeader, ExecutivePage, ExecutiveSection } from "@/components/executive";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
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

export const metadata = { title: "Importar Arquivos" };

export default async function ImportarArquivosPage({
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
  const showWorkOrders = hasCapability(ctx, "work_orders");

  const modules = [
    {
      key: "financeiro",
      title: "Financeiro",
      description: "Movimentações, contas a pagar/receber via Excel ou CSV.",
      icon: Wallet,
      href: `/${tenantSlug}/integracoes/importar/financeiro`,
    },
    {
      key: "vendas",
      title: "Vendas",
      description: "Pedidos, orçamentos e vendas concluídas via Excel ou CSV.",
      icon: ShoppingCart,
      href: `/${tenantSlug}/integracoes/importar/vendas`,
    },
    ...(showWorkOrders
      ? [
          {
            key: "ordens",
            title: ui.importModuleTitle,
            description: ui.importModuleDescription,
            icon: Wrench,
            href: `/${tenantSlug}/integracoes/importar/ordens`,
          },
        ]
      : []),
  ];

  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs
        items={[
          { label: "Integrações", href: `/${tenantSlug}/integracoes` },
          { label: "Importar Arquivos" },
        ]}
      />
      <ExecutiveHeader
        title="Importar Arquivos"
        description="Escolha o módulo de destino. Todos usam a mesma engine de importação — parsing, segurança, mapeamento, classificação e histórico."
      />

      <ExecutiveSection title="Escolha o módulo" panel>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <Card key={m.key} className="border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <m.icon className="size-4 text-muted-foreground" aria-hidden />
                  {m.title}
                </CardTitle>
                <CardDescription>{m.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" render={<Link href={m.href} />}>
                  Importar {m.title}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </ExecutiveSection>
    </ExecutivePage>
  );
}
