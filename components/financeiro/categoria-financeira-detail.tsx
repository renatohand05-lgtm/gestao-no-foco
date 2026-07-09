import Link from "next/link";

import { ModuleHeader } from "@/components/layout/module-header";
import { CategoriaFinanceiraDeleteButton } from "@/components/financeiro/categoria-financeira-delete-button";
import { FinanceiroStatusBadge } from "@/components/financeiro/financeiro-status-badge";
import { ActionButton } from "@/components/ui/action-button";
import { FormGrid } from "@/components/ui/form-grid";
import { SectionCard } from "@/components/ui/section-card";
import {
  formatFinanceiroDate,
  getCategoriaFinanceiraTipoLabel,
} from "@/lib/financeiro/format";
import type { CategoriaFinanceira, PlanoContaResumo } from "@/types/financeiro";

type Props = {
  tenantSlug: string;
  item: CategoriaFinanceira;
  planoConta?: PlanoContaResumo | null;
};

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

export function CategoriaFinanceiraDetail({
  tenantSlug,
  item,
  planoConta,
}: Props) {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title={item.nome}
        description="Detalhes do registro financeiro"
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Categorias Financeiras", href: `/${tenantSlug}/financeiro/categorias` },
          { label: item.nome },
        ]}
      >
        <FinanceiroStatusBadge ativo={item.ativo} />
        <ActionButton
          action="edit"
          href={`/${tenantSlug}/financeiro/categorias/${item.id}/editar`}
        />
        <CategoriaFinanceiraDeleteButton
          tenantSlug={tenantSlug}
          id={item.id}
          nome={item.nome}
        />
      </ModuleHeader>

      <div className="grid gap-6 lg:grid-cols-2">

      <SectionCard title="Classificação">
        <FormGrid>
          <DetailItem label="Tipo" value={getCategoriaFinanceiraTipoLabel(item.tipo)} />
          <DetailItem
            label="Plano de contas"
            value={
              planoConta ? (
                <Link
                  href={`/${tenantSlug}/financeiro/plano-contas/${planoConta.id}`}
                  className="hover:underline"
                >
                  {planoConta.codigo} — {planoConta.nome}
                </Link>
              ) : (
                "—"
              )
            }
          />
          <DetailItem label="Cor" value={item.cor || "—"} />
        </FormGrid>
      </SectionCard>
      <SectionCard title="Observações">
        <p className="text-sm whitespace-pre-wrap">{item.observacoes || "—"}</p>
      </SectionCard>
      <SectionCard title="Auditoria">
        <FormGrid>
          <DetailItem label="Criado em" value={formatFinanceiroDate(item.created_at)} />
          <DetailItem label="Atualizado em" value={formatFinanceiroDate(item.updated_at)} />
        </FormGrid>
      </SectionCard>
      </div>
    </div>
  );
}
