import Link from "next/link";

import { ModuleHeader } from "@/components/layout/module-header";
import { PlanoContaDeleteButton } from "@/components/financeiro/plano-conta-delete-button";
import { FinanceiroStatusBadge } from "@/components/financeiro/financeiro-status-badge";
import { ActionButton } from "@/components/ui/action-button";
import { FormGrid } from "@/components/ui/form-grid";
import { SectionCard } from "@/components/ui/section-card";
import {
  formatFinanceiroDate,
  getPlanoContaNaturezaLabel,
  getPlanoContaTipoLabel,
} from "@/lib/financeiro/format";
import type { PlanoConta, PlanoContaResumo } from "@/types/financeiro";

type Props = {
  tenantSlug: string;
  item: PlanoConta;
  contaPai?: PlanoContaResumo | null;
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

export function PlanoContaDetail({ tenantSlug, item, contaPai }: Props) {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title={item.nome}
        description="Detalhes do registro financeiro"
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Plano de Contas", href: `/${tenantSlug}/financeiro/plano-contas` },
          { label: item.nome },
        ]}
      >
        <FinanceiroStatusBadge ativo={item.ativo} />
        <ActionButton
          action="edit"
          href={`/${tenantSlug}/financeiro/plano-contas/${item.id}/editar`}
        />
        <PlanoContaDeleteButton
          tenantSlug={tenantSlug}
          id={item.id}
          nome={item.nome}
        />
      </ModuleHeader>

      <div className="grid gap-6 lg:grid-cols-2">

      <SectionCard title="Identificação">
        <FormGrid>
          <DetailItem label="Código" value={item.codigo} />
          <DetailItem label="Tipo" value={getPlanoContaTipoLabel(item.tipo)} />
          <DetailItem label="Natureza" value={getPlanoContaNaturezaLabel(item.natureza)} />
          <DetailItem label="Aceita lançamento" value={item.aceita_lancamento ? "Sim" : "Não"} />
          <DetailItem label="Ordem" value={item.ordem} />
          <DetailItem
            label="Conta pai"
            value={
              contaPai ? (
                <Link
                  href={`/${tenantSlug}/financeiro/plano-contas/${contaPai.id}`}
                  className="hover:underline"
                >
                  {contaPai.codigo} — {contaPai.nome}
                </Link>
              ) : (
                "—"
              )
            }
          />
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
