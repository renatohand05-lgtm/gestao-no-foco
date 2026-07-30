import { notFound } from "next/navigation";

import { FornecedorForm } from "@/components/financeiro/fornecedor-form";
import { createContaPagarService } from "@/lib/financeiro/conta-pagar-service";
import { createFornecedorService } from "@/lib/financeiro/fornecedor-service";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";
import {
  ExecutiveHeader,
  ExecutivePage,
} from "@/components/executive";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata = { title: "Editar fornecedor" };

type PageProps = { params: Promise<{ tenant: string; id: string }> };

export default async function Page({ params }: PageProps) {
  const { tenant: tenantSlug, id } = await params;

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
            { label: "Editar" },
          ]} />
        <ExecutiveHeader title="Editar fornecedor" description="Edição" />
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
  const service = await createFornecedorService(tenant.id);
  const item = await service.getById(id);
  if (!item) notFound();

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
          {
            label: item.nome,
            href: `/${tenantSlug}/financeiro/fornecedores/${item.id}`,
          },
          { label: "Editar" },
        ]} />
      <ExecutiveHeader title="Editar fornecedor" description="Alterações invalidam cache de opções do tenant." />
      <FornecedorForm
        tenantSlug={tenantSlug}
        mode="edit"
        item={item}
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
