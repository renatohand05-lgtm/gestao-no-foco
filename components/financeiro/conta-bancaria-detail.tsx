import { ModuleHeader } from "@/components/layout/module-header";
import { ContaBancariaDeleteButton } from "@/components/financeiro/conta-bancaria-delete-button";
import { ContaBancariaMovimentacoesTable } from "@/components/financeiro/conta-bancaria-movimentacoes-table";
import { FinanceiroStatusBadge } from "@/components/financeiro/financeiro-status-badge";
import { ActionButton } from "@/components/ui/action-button";
import { FormGrid } from "@/components/ui/form-grid";
import { SectionCard } from "@/components/ui/section-card";
import {
  formatCurrency,
  formatFinanceiroDate,
  getContaBancariaTipoLabel,
} from "@/lib/financeiro/format";
import type { ContaBancaria } from "@/types/financeiro";
import type { MovimentacaoBancariaListItem } from "@/types/movimentacoes-bancarias";

type Props = {
  tenantSlug: string;
  item: ContaBancaria;
  movimentacoes: MovimentacaoBancariaListItem[];
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

export function ContaBancariaDetail({
  tenantSlug,
  item,
  movimentacoes,
}: Props) {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title={item.nome}
        description="Detalhes do registro financeiro"
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          {
            label: "Contas Bancárias",
            href: `/${tenantSlug}/financeiro/contas-bancarias`,
          },
          { label: item.nome },
        ]}
      >
        <FinanceiroStatusBadge ativo={item.ativo} />
        <ActionButton
          action="edit"
          href={`/${tenantSlug}/financeiro/contas-bancarias/${item.id}/editar`}
        />
        <ContaBancariaDeleteButton
          tenantSlug={tenantSlug}
          id={item.id}
          nome={item.nome}
        />
      </ModuleHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Dados da conta">
          <FormGrid>
            <DetailItem
              label="Tipo"
              value={getContaBancariaTipoLabel(item.tipo)}
            />
            <DetailItem label="Banco" value={item.banco || "—"} />
            <DetailItem label="Agência" value={item.agencia || "—"} />
            <DetailItem label="Conta" value={item.conta || "—"} />
            <DetailItem label="Titular" value={item.titular || "—"} />
            <DetailItem
              label="Saldo operacional"
              value={formatCurrency(item.saldo_atual ?? item.saldo_inicial)}
            />
            <DetailItem
              label="Saldo inicial"
              value={formatCurrency(item.saldo_inicial)}
            />
          </FormGrid>
        </SectionCard>
        <SectionCard title="Observações">
          <p className="text-sm whitespace-pre-wrap">
            {item.observacoes || "—"}
          </p>
        </SectionCard>
        <SectionCard title="Auditoria">
          <FormGrid>
            <DetailItem
              label="Criado em"
              value={formatFinanceiroDate(item.created_at)}
            />
            <DetailItem
              label="Atualizado em"
              value={formatFinanceiroDate(item.updated_at)}
            />
          </FormGrid>
        </SectionCard>
      </div>

      <SectionCard
        title="Movimentações recentes"
        description="Últimas 20 movimentações desta conta."
      >
        <ContaBancariaMovimentacoesTable items={movimentacoes} />
      </SectionCard>
    </div>
  );
}
