import { CentroCustoDeleteButton } from "@/components/financeiro/centro-custo-delete-button";
import { FinanceiroStatusBadge } from "@/components/financeiro/financeiro-status-badge";
import { ActionButton } from "@/components/ui/action-button";
import { FormGrid } from "@/components/ui/form-grid";
import { formatFinanceiroDate } from "@/lib/financeiro/format";
import type { CentroCusto } from "@/types/financeiro";
import {
  ExecutiveHeader,
  ExecutivePage,
  ExecutiveSection,
} from "@/components/executive";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

type Props = {
  tenantSlug: string;
  item: CentroCusto;
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

export function CentroCustoDetail({ tenantSlug, item }: Props) {
  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs items={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Centros de Custo", href: `/${tenantSlug}/financeiro/centros-custo` },
          { label: item.nome },
        ]} />
      <ExecutiveHeader title={item.nome} description="Detalhes do registro financeiro" actions={<>
<FinanceiroStatusBadge ativo={item.ativo} />
        <ActionButton
          action="edit"
          href={`/${tenantSlug}/financeiro/centros-custo/${item.id}/editar`}
        />
        <CentroCustoDeleteButton
          tenantSlug={tenantSlug}
          id={item.id}
          nome={item.nome}
        />
</>} />

      <div className="grid gap-6 lg:grid-cols-2">

      <ExecutiveSection title="Identificação" panel>
        <FormGrid>
          <DetailItem label="Código" value={item.codigo} />
          <DetailItem label="Responsável" value={item.responsavel || "—"} />
          <DetailItem label="Descrição" value={item.descricao || "—"} />
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
