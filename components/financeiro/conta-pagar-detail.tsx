import { ContaPagarCancelButton } from "@/components/financeiro/conta-pagar-cancel-button";
import { ContaPagarDeleteButton } from "@/components/financeiro/conta-pagar-delete-button";
import { ContaPagarPagarButton } from "@/components/financeiro/conta-pagar-pagar-button";
import { ContaPagarStatusBadge } from "@/components/financeiro/conta-pagar-status-badge";
import { ModuleHeader } from "@/components/layout/module-header";
import { ActionButton } from "@/components/ui/action-button";
import { FormGrid } from "@/components/ui/form-grid";
import { SectionCard } from "@/components/ui/section-card";
import {
  calcSaldoPendente,
  calcValorLiquido,
  canCancelarContaPagar,
  canEditContaPagar,
  canPagarContaPagar,
  formatContaPagarNumero,
  resolveFornecedorNome,
} from "@/lib/financeiro/conta-pagar-utils";
import { formatCurrency, formatDateOnly, formatFinanceiroDate } from "@/lib/financeiro/format";
import type { ContaPagarDetail } from "@/types/contas-pagar";

type Props = {
  tenantSlug: string;
  item: ContaPagarDetail;
  formasPagamento: { id: string; nome: string }[];
  contasBancarias: { id: string; nome: string }[];
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

export function ContaPagarDetail({
  tenantSlug,
  item,
  formasPagamento,
  contasBancarias,
}: Props) {
  const valorLiquido = calcValorLiquido(item);
  const saldo = calcSaldoPendente(item);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title={formatContaPagarNumero(item.numero)}
        description={item.descricao}
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          {
            label: "Contas a Pagar",
            href: `/${tenantSlug}/financeiro/contas-pagar`,
          },
          { label: formatContaPagarNumero(item.numero) },
        ]}
      >
        <ContaPagarStatusBadge status={item.status_exibicao} />
        {canPagarContaPagar(item) ? (
          <ContaPagarPagarButton
            tenantSlug={tenantSlug}
            item={item}
            formasPagamento={formasPagamento}
            contasBancarias={contasBancarias}
          />
        ) : null}
        {canEditContaPagar(item) ? (
          <ActionButton
            action="edit"
            href={`/${tenantSlug}/financeiro/contas-pagar/${item.id}/editar`}
          />
        ) : null}
        {canCancelarContaPagar(item) ? (
          <ContaPagarCancelButton
            tenantSlug={tenantSlug}
            id={item.id}
            descricao={item.descricao}
          />
        ) : null}
        {item.status === "cancelado" ? (
          <ContaPagarDeleteButton
            tenantSlug={tenantSlug}
            id={item.id}
            descricao={item.descricao}
          />
        ) : null}
      </ModuleHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Fornecedor e vínculos">
          <FormGrid>
            <DetailItem label="Fornecedor" value={resolveFornecedorNome(item)} />
            <DetailItem
              label="Documento"
              value={item.fornecedor?.documento || "—"}
            />
            <DetailItem
              label="Forma de pagamento"
              value={item.forma_pagamento?.nome ?? "—"}
            />
            <DetailItem
              label="Categoria financeira"
              value={item.categoria_financeira?.nome ?? "—"}
            />
            <DetailItem
              label="Centro de custo"
              value={
                item.centro_custo
                  ? `${item.centro_custo.codigo} · ${item.centro_custo.nome}`
                  : "—"
              }
            />
            <DetailItem
              label="Plano de contas"
              value={
                item.plano_conta
                  ? `${item.plano_conta.codigo} · ${item.plano_conta.nome}`
                  : "—"
              }
            />
            <DetailItem
              label="Conta bancária (baixa)"
              value={item.conta_bancaria?.nome ?? "—"}
            />
            <DetailItem
              label="Parcela"
              value={`${item.parcela_numero} de ${item.parcela_total}`}
            />
          </FormGrid>
        </SectionCard>

        <SectionCard title="Valores">
          <FormGrid>
            <DetailItem
              label="Valor original"
              value={formatCurrency(item.valor_original)}
            />
            <DetailItem label="Desconto" value={formatCurrency(item.desconto)} />
            <DetailItem label="Juros" value={formatCurrency(item.juros)} />
            <DetailItem label="Multa" value={formatCurrency(item.multa)} />
            <DetailItem
              label="Valor líquido"
              value={formatCurrency(valorLiquido)}
            />
            <DetailItem
              label="Valor pago"
              value={formatCurrency(item.valor_pago)}
            />
            <DetailItem label="Saldo pendente" value={formatCurrency(saldo)} />
          </FormGrid>
        </SectionCard>

        <SectionCard title="Datas">
          <FormGrid>
            <DetailItem
              label="Emissão"
              value={formatDateOnly(item.data_emissao)}
            />
            <DetailItem
              label="Competência"
              value={formatDateOnly(item.data_competencia)}
            />
            <DetailItem
              label="Vencimento"
              value={formatDateOnly(item.data_vencimento)}
            />
            <DetailItem
              label="Pagamento"
              value={formatDateOnly(item.data_pagamento)}
            />
          </FormGrid>
        </SectionCard>

        <SectionCard title="Observações">
          <p className="text-sm whitespace-pre-wrap">
            {item.observacoes || "—"}
          </p>
        </SectionCard>

        <SectionCard title="Anexos">
          <p className="text-sm text-muted-foreground">
            Estrutura preparada para anexos futuros. Upload ainda não disponível.
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
    </div>
  );
}
