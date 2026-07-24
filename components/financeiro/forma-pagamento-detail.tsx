import { FormaPagamentoDeleteButton } from "@/components/financeiro/forma-pagamento-delete-button";
import { FinanceiroStatusBadge } from "@/components/financeiro/financeiro-status-badge";
import { ActionButton } from "@/components/ui/action-button";
import { FormGrid } from "@/components/ui/form-grid";
import {
  formatFinanceiroDate,
  formatPercent,
  getFormaPagamentoTipoLabel,
} from "@/lib/financeiro/format";
import type { FormaPagamento } from "@/types/financeiro";
import {
  ExecutiveHeader,
  ExecutivePage,
  ExecutiveSection,
} from "@/components/executive";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

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
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs items={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Formas de Pagamento", href: `/${tenantSlug}/financeiro/formas-pagamento` },
          { label: item.nome },
        ]} />
      <ExecutiveHeader title={item.nome} description="Detalhes do registro financeiro" actions={<>
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
</>} />

      <div className="grid gap-6 lg:grid-cols-2">

      <ExecutiveSection title="Parâmetros" panel>
        <FormGrid>
          <DetailItem label="Tipo" value={getFormaPagamentoTipoLabel(item.tipo)} />
          <DetailItem label="Gera financeiro" value={item.gera_financeiro ? "Sim" : "Não"} />
          <DetailItem label="Dias de compensação" value={`${item.dias_compensacao} dia(s)`} />
          <DetailItem label="Taxa" value={formatPercent(item.taxa_percent)} />
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
