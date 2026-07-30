import { notFound } from "next/navigation";

import { FormaPagamentoForm } from "@/components/financeiro/forma-pagamento-form";
import { createFormaPagamentoService } from "@/lib/financeiro/forma-pagamento-service";
import {
  financePageAuthError,
  requireFinancePagePermission,
} from "@/lib/finance/page-auth";
import {
  ExecutiveHeader,
  ExecutivePage,
  ExecutiveSection,
} from "@/components/executive";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

export const metadata = { title: "Editar" };

export default async function EditarPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
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
            { label: "Formas de Pagamento", href: `/${tenantSlug}/financeiro/formas-pagamento` },
            { label: "Editar" },
          ]} />
        <ExecutiveHeader title="Editar" description="Atualize o registro" />
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
  const service = await createFormaPagamentoService(tenant.id);
  const item = await service.getById(id);

  if (!item) {
    notFound();
  }

  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs items={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Formas de Pagamento", href: `/${tenantSlug}/financeiro/formas-pagamento` },
          {
            label: item.nome,
            href: `/${tenantSlug}/financeiro/formas-pagamento/${item.id}`,
          },
          { label: "Editar" },
        ]} />
      <ExecutiveHeader title={`Editar ${item.nome}`} description={`Atualize o registro em ${tenant.name}`} />

      <ExecutiveSection title="Cadastro" description="Atualize os dados do registro." panel>
        <FormaPagamentoForm tenantSlug={tenantSlug} mode="edit" item={item} />
      </ExecutiveSection>
    </ExecutivePage>
  );
}
