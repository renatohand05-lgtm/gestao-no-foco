import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { ModuleHeader } from "@/components/layout/module-header";
import { ActionButton } from "@/components/ui/action-button";
import { FormGrid } from "@/components/ui/form-grid";
import { SectionCard } from "@/components/ui/section-card";
import { createFornecedorService } from "@/lib/financeiro/fornecedor-service";
import { formatDreHierarchyPath } from "@/lib/dre";
import type { DreLinhaEconomica } from "@/lib/dre";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Fornecedor" };

type PageProps = { params: Promise<{ tenant: string; id: string }> };

function Item({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

export default async function Page({ params }: PageProps) {
  const { tenant: tenantSlug, id } = await params;
  const tenant = await requireTenant(tenantSlug);
  const service = await createFornecedorService(tenant.id);
  const item = await service.getById(id);
  if (!item) notFound();

  const dreLinha =
    item.plano_conta?.dre_linha ?? item.categoria_financeira?.dre_linha ?? null;
  const dreDetalhe =
    item.plano_conta?.dre_detalhe ??
    item.categoria_financeira?.dre_detalhe ??
    null;

  return (
    <div className="space-y-6">
      <ModuleHeader
        title={item.nome_fantasia || item.nome}
        description={item.nome_fantasia ? item.nome : "Fornecedor mestre"}
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          {
            label: "Fornecedores",
            href: `/${tenantSlug}/financeiro/fornecedores`,
          },
          { label: item.nome_fantasia || item.nome },
        ]}
      >
        <ActionButton
          action="edit"
          href={`/${tenantSlug}/financeiro/fornecedores/${item.id}/editar`}
        />
      </ModuleHeader>

      <SectionCard title="Contato">
        <FormGrid>
          <Item label="Documento" value={item.documento || "—"} />
          <Item label="E-mail" value={item.email || "—"} />
          <Item label="Telefone" value={item.telefone || "—"} />
          <Item
            label="Cidade/UF"
            value={
              item.cidade
                ? `${item.cidade}${item.estado ? `/${item.estado}` : ""}`
                : "—"
            }
          />
        </FormGrid>
      </SectionCard>

      <SectionCard title="Padrões financeiros">
        <FormGrid>
          <Item
            label="Categoria"
            value={item.categoria_financeira?.nome ?? "—"}
          />
          <Item
            label="Plano"
            value={
              item.plano_conta
                ? `${item.plano_conta.codigo} · ${item.plano_conta.nome}`
                : "—"
            }
          />
          <Item
            label="Centro"
            value={
              item.centro_custo
                ? `${item.centro_custo.codigo} · ${item.centro_custo.nome}`
                : "—"
            }
          />
          <Item
            label="Forma pagamento"
            value={item.forma_pagamento?.nome ?? "—"}
          />
          <Item
            label="Conta bancária"
            value={item.conta_bancaria?.nome ?? "—"}
          />
          <Item
            label="Linha DRE (derivada)"
            value={
              dreLinha
                ? formatDreHierarchyPath(
                    dreLinha as DreLinhaEconomica,
                    dreDetalhe,
                  )
                : "—"
            }
          />
          <Item
            label="Recorrente"
            value={
              item.recorrente
                ? `Sim${item.frequencia ? ` · ${item.frequencia}` : ""}`
                : "Não"
            }
          />
        </FormGrid>
      </SectionCard>
    </div>
  );
}
