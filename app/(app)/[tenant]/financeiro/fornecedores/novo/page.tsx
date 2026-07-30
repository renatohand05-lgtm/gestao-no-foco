import { FornecedorForm } from "@/components/financeiro/fornecedor-form";
import { createContaPagarService } from "@/lib/financeiro/conta-pagar-service";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";
import {
  ExecutiveHeader,
  ExecutivePage,
} from "@/components/executive";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata = { title: "Novo fornecedor" };

type PageProps = { params: Promise<{ tenant: string }> };

export default async function Page({ params }: PageProps) {
  const { tenant: tenantSlug } = await params;

  let auth;
  try {
    auth = await requireFinancePagePermission(tenantSlug, [
      "financeiro.visualizar",
    ]);
  } catch (error) {
    const err = financePageAuthError(error);
    return (
      <ExecutivePage width="wide" spacing="loose">
        <Breadcrumbs items={[
            { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
            {
              label: "Fornecedores",
              href: `/${tenantSlug}/financeiro/fornecedores`,
            },
            { label: "Novo" },
          ]} />
        <ExecutiveHeader title="Novo fornecedor" description="Cadastro" />
        <p
          className="rounded-lg border border-amber-600/40 px-3 py-3 text-sm"
          role="alert"
          data-finance-rbac="denied"
        >
          {err.message}
        </p>
      </ExecutivePage>
    );
  }

  const { tenant } = auth;
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
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs items={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          {
            label: "Fornecedores",
            href: `/${tenantSlug}/financeiro/fornecedores`,
          },
          { label: "Novo" },
        ]} />
      <ExecutiveHeader title="Novo fornecedor" description="Defina padrões financeiros para autopreenchimento em Contas a Pagar." />
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
    </ExecutivePage>
  );
}
