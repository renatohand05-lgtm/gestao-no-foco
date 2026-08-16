import { notFound } from "next/navigation";

import { ProdutoForm } from "@/components/produtos/produto-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { ServiceReturnRuleForm } from "@/components/retention/service-return-rule-form";
import { createServiceReturnRuleService } from "@/lib/retention/rule-service";
import { createProdutoService } from "@/lib/produtos/produto-service";
import { getSegmentFormConfig } from "@/lib/segments/form-config.ts";
import { resolveSegmentContext } from "@/lib/segments/resolve.ts";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Editar item" };

export default async function EditarProdutoPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant: tenantSlug, id } = await params;
  const tenant = await requireTenant(tenantSlug);
  const ctx = resolveSegmentContext({
    segment: tenant.segment,
    segmentVersion: tenant.segment_version,
    segmentConfig: tenant.segment_config,
  });
  const formConfig = getSegmentFormConfig(ctx);
  const service = await createProdutoService(tenant.id);
  const produto = await service.getById(id);

  if (!produto) {
    notFound();
  }

  const rule =
    produto.tipo === "servico"
      ? await createServiceReturnRuleService(tenant.id).then((s) =>
          s.get(produto.id),
        )
      : null;

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Editar item"
        description={`Atualize os dados de ${produto.nome}`}
        breadcrumbs={[
          { label: "Produtos & Serviços", href: `/${tenantSlug}/produtos` },
          { label: produto.nome, href: `/${tenantSlug}/produtos/${produto.id}` },
          { label: "Editar" },
        ]}
      />

      <SectionCard
        title="Cadastro completo"
        description="Todos os campos do módulo enterprise de produtos e serviços."
      >
        <ProdutoForm
          tenantSlug={tenantSlug}
          mode="edit"
          produto={produto}
          formConfig={formConfig}
        />
      </SectionCard>
      {produto.tipo === "servico" && rule ? (
        <SectionCard
          title="Regra de retorno (opcional)"
          description="Não força o serviço. Estética/odonto: use template sem procedimento."
        >
          <ServiceReturnRuleForm
            tenantSlug={tenantSlug}
            produtoId={produto.id}
            segment={tenant.segment}
            initial={rule}
          />
        </SectionCard>
      ) : null}
    </div>
  );
}
