import { FornecedorForm } from "@/components/financeiro/fornecedor-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { createContaPagarService } from "@/lib/financeiro/conta-pagar-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Novo fornecedor" };

type PageProps = { params: Promise<{ tenant: string }> };

export default async function Page({ params }: PageProps) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const cp = await createContaPagarService(tenant.id);
  const [categorias, planos, centros, formas, contasBancarias] =
    await Promise.all([
      cp.listCategorias(),
      cp.listPlanoContas(),
      cp.listCentrosCusto(),
      cp.listFormasPagamento(),
      cp.listContasBancarias(),
    ]);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Novo fornecedor"
        description="Defina padrões financeiros para autopreenchimento em Contas a Pagar."
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          {
            label: "Fornecedores",
            href: `/${tenantSlug}/financeiro/fornecedores`,
          },
          { label: "Novo" },
        ]}
      />
      <FornecedorForm
        tenantSlug={tenantSlug}
        mode="create"
        categorias={categorias.map((c) => ({ id: c.id, label: c.nome }))}
        planos={planos.map((p) => ({
          id: p.id,
          label: `${p.codigo} · ${p.nome}`,
        }))}
        centros={centros.map((c) => ({
          id: c.id,
          label: `${c.codigo} · ${c.nome}`,
        }))}
        formas={formas.map((f) => ({ id: f.id, label: f.nome }))}
        contasBancarias={contasBancarias.map((c) => ({
          id: c.id,
          label: c.nome,
        }))}
      />
    </div>
  );
}
