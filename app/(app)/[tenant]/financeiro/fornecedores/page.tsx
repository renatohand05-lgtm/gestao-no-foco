import Link from "next/link";
import { Truck } from "lucide-react";

import { FinanceiroEmptyState } from "@/components/financeiro/financeiro-empty-state";
import { FinanceiroStatusBadge } from "@/components/financeiro/financeiro-status-badge";
import { ModuleHeader } from "@/components/layout/module-header";
import { ActionButton } from "@/components/ui/action-button";
import {
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
import { createFornecedorService } from "@/lib/financeiro/fornecedor-service";
import { requireTenant } from "@/lib/tenants";

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

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Fornecedores"
        description={`Cadastro mestre de ${tenant.name} — padrões financeiros para autopreenchimento.`}
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Fornecedores" },
        ]}
      >
        <ActionButton
          action="create"
          href={`/${tenantSlug}/financeiro/fornecedores/novo`}
        />
      </ModuleHeader>

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
        <DataTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="hidden sm:table-cell">Documento</TableHead>
                <TableHead className="hidden md:table-cell">Cidade</TableHead>
                <TableHead className="hidden lg:table-cell">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link
                      href={`/${tenantSlug}/financeiro/fornecedores/${item.id}`}
                      className="font-medium hover:underline"
                    >
                      {item.nome_fantasia || item.nome}
                    </Link>
                    {item.nome_fantasia ? (
                      <p className="text-xs text-muted-foreground">{item.nome}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {item.documento || "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {item.cidade
                      ? `${item.cidade}${item.estado ? `/${item.estado}` : ""}`
                      : "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <FinanceiroStatusBadge ativo={item.ativo} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataTable>
      )}
    </div>
  );
}
