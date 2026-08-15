import { OsSubnav } from "@/components/ordens/os-subnav";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import {
  ExecutiveHeader,
  ExecutivePage,
} from "@/components/executive";
import {
  WORK_ORDER_TEMPLATES,
  WORK_ORDER_TIPO_LABELS,
} from "@/lib/ordens/work-order/templates";
import { requireTenant } from "@/lib/tenants";
import { getSegmentUiCopy, osSubnavFromCopy } from "@/lib/segments/copy.ts";

export const metadata = { title: "Templates · Ordem de Trabalho" };

export default async function OrdensTemplatesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const ui = getSegmentUiCopy({
    segment: tenant.segment,
    segmentVersion: tenant.segment_version,
    segmentConfig: tenant.segment_config,
  });
  const subnav = osSubnavFromCopy(ui);

  return (
    <div data-phase28="work-order-templates">
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs
        items={[
          { label: ui.workOrders, href: `/${tenantSlug}/ordens` },
          { label: "Templates" },
        ]}
      />
      <ExecutiveHeader
        title={`Templates de ${ui.workOrder}`}
        description={
          ui.engine
            ? `Modelos reutilizados da operação. ${ui.workOrders} usam a mesma estrutura.`
            : "Segmentos configuráveis. Interface permanece “Ordem de Serviço” para oficina. Persistência tenant em migration 28.4."
        }
        actions={<OsSubnav tenantSlug={tenantSlug} active="templates" copy={subnav} />}
      />

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {WORK_ORDER_TEMPLATES.map((t) => (
          <Card key={t.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {WORK_ORDER_TIPO_LABELS[t.key]}
              </CardTitle>
              <CardDescription>
                key: {t.key} · status inicial: {t.defaultStatus}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Veículo:</span>{" "}
                {t.requiresVeiculo ? "obrigatório" : "opcional"}
              </p>
              <p>
                <span className="text-muted-foreground">Checklist:</span>{" "}
                {t.requiresChecklist ? "sim" : "não"}
              </p>
              <p>
                <span className="text-muted-foreground">Campos:</span>{" "}
                {t.campos.join(", ")}
              </p>
              <p>
                <span className="text-muted-foreground">Etapas:</span>{" "}
                {t.etapas.join(" → ")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </ExecutivePage>
    </div>
  );
}
