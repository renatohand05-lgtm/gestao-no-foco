import type { ReactNode } from "react";

import { ContaLifecycleCancelButton } from "@/components/financeiro/conta-lifecycle-cancel-button";
import { ContaLifecycleDeleteButton } from "@/components/financeiro/conta-lifecycle-delete-button";
import { ContaLifecycleEstornoButton } from "@/components/financeiro/conta-lifecycle-estorno-button";
import { ContaLancamentoHistorico } from "@/components/financeiro/conta-lancamento-historico";
import { ContaPagarPagarButton } from "@/components/financeiro/conta-pagar-pagar-button";
import { ContaPagarStatusBadge } from "@/components/financeiro/conta-pagar-status-badge";
import { ModuleHeader } from "@/components/layout/module-header";
import { ActionButton } from "@/components/ui/action-button";
import { FormGrid } from "@/components/ui/form-grid";
import { SectionCard } from "@/components/ui/section-card";
import type { ContaLifecycleSnapshot } from "@/lib/financeiro/conta-lifecycle";
import {
  calcSaldoPendente,
  calcValorLiquido,
  canCancelarContaPagar,
  canEditClassificacaoContaPagar,
  canEditContaPagar,
  canEstornarContaPagar,
  canPagarContaPagar,
  canSoftDeleteContaPagar,
  formatContaPagarNumero,
  resolveFornecedorNome,
  resolveStatusExibicao,
} from "@/lib/financeiro/conta-pagar-utils";
import type { FinanceiroLancamentoEvent } from "@/lib/financeiro/financeiro-eventos";
import { formatCurrency, formatDateOnly, formatFinanceiroDate } from "@/lib/financeiro/format";
import type { ContaPagarDetail as ContaPagarDetailType } from "@/types/contas-pagar";

type Props = {
  tenantSlug: string;
  item: ContaPagarDetailType;
  formasPagamento: { id: string; nome: string }[];
  contasBancarias: { id: string; nome: string }[];
  events?: FinanceiroLancamentoEvent[];
};

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
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

function toSnapshot(item: ContaPagarDetailType): ContaLifecycleSnapshot {
  return {
    id: item.id,
    numero: item.numero,
    descricao: item.descricao,
    status: resolveStatusExibicao(item),
    valor_original: item.valor_original,
    valor_liquidado: item.valor_pago,
    data_competencia: item.data_competencia,
    data_vencimento: item.data_vencimento,
    counterparty: resolveFornecedorNome(item),
    grupo_parcelamento_id: item.grupo_parcelamento_id,
    parcela_numero: item.parcela_numero,
    parcela_total: item.parcela_total,
  };
}

export function ContaPagarDetail({
  tenantSlug,
  item,
  formasPagamento,
  contasBancarias,
  events = [],
}: Props) {
  const valorLiquido = calcValorLiquido(item);
  const saldo = calcSaldoPendente(item);
  const snapshot = toSnapshot(item);

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
        ) : canEditClassificacaoContaPagar(item) ? (
          <ActionButton
            action="edit"
            label="Corrigir classificação"
            href={`/${tenantSlug}/financeiro/contas-pagar/${item.id}/editar?classificacaoOnly=true`}
          />
        ) : null}
        {canEstornarContaPagar(item) ? (
          <ContaLifecycleEstornoButton
            tenantSlug={tenantSlug}
            kind="pagar"
            snapshot={snapshot}
          />
        ) : null}
        {canCancelarContaPagar(item) ? (
          <ContaLifecycleCancelButton
            tenantSlug={tenantSlug}
            kind="pagar"
            snapshot={snapshot}
          />
        ) : null}
        {canSoftDeleteContaPagar(item) ? (
          <ContaLifecycleDeleteButton
            tenantSlug={tenantSlug}
            kind="pagar"
            snapshot={snapshot}
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
              label="Linha do DRE"
              value={
                item.plano_conta?.dre_linha ||
                item.categoria_financeira?.dre_linha || (
                  <span className="text-amber-800">Pendente de classificação</span>
                )
              }
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

        {(item.rateios?.length ?? 0) > 0 ? (
          <SectionCard title="Rateio">
            <ul className="space-y-2 text-sm">
              {item.rateios!.map((line) => (
                <li
                  key={line.id ?? `${line.centro_custo_id}-${line.percentual}`}
                  className="flex flex-wrap justify-between gap-2 border-b border-border/50 pb-2 last:border-0"
                >
                  <span>
                    {line.centro_custo
                      ? `${line.centro_custo.codigo} · ${line.centro_custo.nome}`
                      : line.centro_custo_id}
                    {line.descricao ? ` — ${line.descricao}` : ""}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {line.percentual}% · {formatCurrency(line.valor)}
                  </span>
                </li>
              ))}
            </ul>
          </SectionCard>
        ) : null}

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

        <div className="lg:col-span-2">
          <ContaLancamentoHistorico events={events} />
        </div>
      </div>
    </div>
  );
}
