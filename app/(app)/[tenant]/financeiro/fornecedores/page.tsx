import Link from "next/link";
import { Truck } from "lucide-react";

import { FinanceiroEmptyState } from "@/components/financeiro/financeiro-empty-state";
import { FinanceiroStatusBadge } from "@/components/financeiro/financeiro-status-badge";
import {
  ExecutiveHeader,
  ExecutivePage,
  ExecutiveTable,
  type ExecutiveTableColumn,
} from "@/components/executive";
import { ActionButton } from "@/components/ui/action-button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { createFornecedorService } from "@/lib/financeiro/fornecedor-service";
import { requireTenant } from "@/lib/tenants";
import type { FornecedorListItem } from "@/types/fornecedores";

export const metadata = { title: "Fornecedores" };

type PageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ q?: string }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const { tenant: tenantSlug } = await params;
  const { q } = await searchParams;
  const tenant = await requireTenant(tenantSlug);
  const service = await createFornecedorService(tenant.id);
  const result = await service.list({ search: q, perPage: 50 });

  const columns: ExecutiveTableColumn<FornecedorListItem>[] = [
    {
      id: "fornecedor",
      header: "Fornecedor",
      cell: (item) => (
        <>
          <Link
            href={`/${tenantSlug}/financeiro/fornecedores/${item.id}`}
            className="font-medium hover:underline"
          >
            {item.nome_fantasia || item.nome}
          </Link>
          {item.nome_fantasia ? (
            <p className="text-xs text-muted-foreground">{item.nome}</p>
          ) : null}
        </>
      ),
    },
    {
      id: "documento",
      header: "Documento",
      className: "hidden sm:table-cell",
      cell: (item) => item.documento || "—",
    },
    {
      id: "cidade",
      header: "Cidade",
      className: "hidden md:table-cell",
      cell: (item) =>
        item.cidade
          ? `${item.cidade}${item.estado ? `/${item.estado}` : ""}`
          : "—",
    },
    {
      id: "status",
      header: "Status",
      className: "hidden lg:table-cell",
      cell: (item) => <FinanceiroStatusBadge ativo={item.ativo} />,
    },
  ];

  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs
        items={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Fornecedores" },
        ]}
      />
      <ExecutiveHeader
        title="Fornecedores"
        description={`Cadastro mestre de ${tenant.name} — padrões financeiros para autopreenchimento.`}
        actions={
          <ActionButton
            action="create"
            href={`/${tenantSlug}/financeiro/fornecedores/novo`}
          />
        }
      />

      {result.data.length === 0 ? (
        <FinanceiroEmptyState
          tenantSlug={tenantSlug}
          basePath="fornecedores"
          icon={Truck}
          title="Nenhum fornecedor"
          description="Cadastre fornecedores com categoria e centro padrão para sugerir classificação nas Contas a Pagar."
          createLabel="Novo fornecedor"
          hasSearch={Boolean(q)}
          hasFilters={false}
        />
      ) : (
        <ExecutiveTable
          columns={columns}
          rows={result.data}
          getRowId={(row) => row.id}
          stickyHeader
        />
      )}
    </ExecutivePage>
  );
}
