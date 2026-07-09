import { ModuleHeader } from "@/components/layout/module-header";
import { FormaPagamentoDeleteButton } from "@/components/financeiro/forma-pagamento-delete-button";
import { FinanceiroStatusBadge } from "@/components/financeiro/financeiro-status-badge";
import { ActionButton } from "@/components/ui/action-button";
import { FormGrid } from "@/components/ui/form-grid";
import { SectionCard } from "@/components/ui/section-card";
import {
  formatFinanceiroDate,
  formatPercent,
  getFormaPagamentoTipoLabel,
} from "@/lib/financeiro/format";
import type { FormaPagamento } from "@/types/financeiro";

type Props = {
  tenantSlug: string;
  item: FormaPagamento;
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

export function FormaPagamentoDetail({ tenantSlug, item }: Props) {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title={item.nome}
        description="Detalhes do registro financeiro"
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Formas de Pagamento", href: `/${tenantSlug}/financeiro/formas-pagamento` },
          { label: item.nome },
        ]}
      >
        <FinanceiroStatusBadge ativo={item.ativo} />
        <ActionButton
          action="edit"
          href={`/${tenantSlug}/financeiro/formas-pagamento/${item.id}/editar`}
        />
        <FormaPagamentoDeleteButton
          tenantSlug={tenantSlug}
          id={item.id}
          nome={item.nome}
        />
      </ModuleHeader>

      <div className="grid gap-6 lg:grid-cols-2">

      <SectionCard title="Parâmetros">
        <FormGrid>
          <DetailItem label="Tipo" value={getFormaPagamentoTipoLabel(item.tipo)} />
          <DetailItem label="Gera financeiro" value={item.gera_financeiro ? "Sim" : "Não"} />
          <DetailItem label="Dias de compensação" value={`${item.dias_compensacao} dia(s)`} />
          <DetailItem label="Taxa" value={formatPercent(item.taxa_percent)} />
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
