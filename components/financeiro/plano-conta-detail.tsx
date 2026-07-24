import Link from "next/link";

import { PlanoContaDeleteButton } from "@/components/financeiro/plano-conta-delete-button";
import { FinanceiroStatusBadge } from "@/components/financeiro/financeiro-status-badge";
import { ActionButton } from "@/components/ui/action-button";
import { FormGrid } from "@/components/ui/form-grid";
import {
  formatFinanceiroDate,
  getPlanoContaNaturezaLabel,
  getPlanoContaTipoLabel,
} from "@/lib/financeiro/format";
import type { PlanoConta, PlanoContaResumo } from "@/types/financeiro";
import {
  ExecutiveHeader,
  ExecutivePage,
  ExecutiveSection,
} from "@/components/executive";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

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
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs items={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Plano de Contas", href: `/${tenantSlug}/financeiro/plano-contas` },
          { label: item.nome },
        ]} />
      <ExecutiveHeader title={item.nome} description="Detalhes do registro financeiro" actions={<>
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
</>} />

      <div className="grid gap-6 lg:grid-cols-2">

      <ExecutiveSection title="Identificação" panel>
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
      </ExecutiveSection>
      <ExecutiveSection title="Observações" panel>
        <p className="text-sm whitespace-pre-wrap">{item.observacoes || "—"}</p>
      </ExecutiveSection>
      <ExecutiveSection title="Auditoria" panel>
        <FormGrid>
          <DetailItem label="Criado em" value={formatFinanceiroDate(item.created_at)} />
          <DetailItem label="Atualizado em" value={formatFinanceiroDate(item.updated_at)} />
        </FormGrid>
      </ExecutiveSection>
      </div>
    </ExecutivePage>
  );
}
