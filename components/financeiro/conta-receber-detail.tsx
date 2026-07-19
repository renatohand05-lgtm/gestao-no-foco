import type { ReactNode } from "react";
import Link from "next/link";

import { ContaLifecycleCancelButton } from "@/components/financeiro/conta-lifecycle-cancel-button";
import { ContaLifecycleDeleteButton } from "@/components/financeiro/conta-lifecycle-delete-button";
import { ContaLifecycleEstornoButton } from "@/components/financeiro/conta-lifecycle-estorno-button";
import { ContaLancamentoHistorico } from "@/components/financeiro/conta-lancamento-historico";
import { ContaReceberReceberButton } from "@/components/financeiro/conta-receber-receber-button";
import { ContaReceberStatusBadge } from "@/components/financeiro/conta-receber-status-badge";
import { ModuleHeader } from "@/components/layout/module-header";
import { ActionButton } from "@/components/ui/action-button";
import { FormGrid } from "@/components/ui/form-grid";
import { SectionCard } from "@/components/ui/section-card";
import type { ContaLifecycleSnapshot } from "@/lib/financeiro/conta-lifecycle";
import {
  calcSaldoPendente,
  calcValorLiquido,
  canCancelarContaReceber,
  canEditClassificacaoContaReceber,
  canEditContaReceber,
  canEstornarContaReceber,
  canReceberContaReceber,
  canSoftDeleteContaReceber,
  formatContaReceberNumero,
  resolveStatusExibicao,
} from "@/lib/financeiro/conta-receber-utils";
import type { FinanceiroLancamentoEvent } from "@/lib/financeiro/financeiro-eventos";
import { formatCurrency, formatDateOnly, formatFinanceiroDate } from "@/lib/financeiro/format";
import type { ContaReceberDetail as ContaReceberDetailType } from "@/types/contas-receber";

type Props = {
  tenantSlug: string;
  item: ContaReceberDetailType;
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

function toSnapshot(item: ContaReceberDetailType): ContaLifecycleSnapshot {
  return {
    id: item.id,
    numero: item.numero,
    descricao: item.descricao,
    status: resolveStatusExibicao(item),
    valor_original: item.valor_original,
    valor_liquidado: item.valor_recebido,
    data_competencia: item.data_competencia,
    data_vencimento: item.data_vencimento,
    counterparty: item.cliente?.nome ?? "—",
    grupo_parcelamento_id: item.grupo_parcelamento_id,
    parcela_numero: item.parcela_numero,
    parcela_total: item.parcela_total,
    venda_id: item.venda_id,
  };
}

export function ContaReceberDetail({
  tenantSlug,
  item,
  contasBancarias,
  events = [],
}: Props) {
  const valorLiquido = calcValorLiquido(item);
  const saldo = calcSaldoPendente(item);
  const snapshot = toSnapshot(item);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title={formatContaReceberNumero(item.numero)}
        description={item.descricao}
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          {
            label: "Contas a Receber",
            href: `/${tenantSlug}/financeiro/contas-receber`,
          },
          { label: formatContaReceberNumero(item.numero) },
        ]}
      >
        <ContaReceberStatusBadge status={item.status_exibicao} />
        {canReceberContaReceber(item) ? (
          <ContaReceberReceberButton
            tenantSlug={tenantSlug}
            item={item}
            contasBancarias={contasBancarias}
          />
        ) : null}
        {canEditContaReceber(item) ? (
          <ActionButton
            action="edit"
            href={`/${tenantSlug}/financeiro/contas-receber/${item.id}/editar`}
          />
        ) : canEditClassificacaoContaReceber(item) ? (
          <ActionButton
            action="edit"
            label="Corrigir classificação"
            href={`/${tenantSlug}/financeiro/contas-receber/${item.id}/editar?classificacaoOnly=true`}
          />
        ) : null}
        {canEstornarContaReceber(item) ? (
          <ContaLifecycleEstornoButton
            tenantSlug={tenantSlug}
            kind="receber"
            snapshot={snapshot}
          />
        ) : null}
        {canCancelarContaReceber(item) ? (
          <ContaLifecycleCancelButton
            tenantSlug={tenantSlug}
            kind="receber"
            snapshot={snapshot}
          />
        ) : null}
        {canSoftDeleteContaReceber(item) ? (
          <ContaLifecycleDeleteButton
            tenantSlug={tenantSlug}
            kind="receber"
            snapshot={snapshot}
          />
        ) : null}
      </ModuleHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Cliente e vínculos">
          <FormGrid>
            <DetailItem label="Cliente" value={item.cliente.nome} />
            <DetailItem
              label="Documento"
              value={item.cliente.documento || "—"}
            />
            <DetailItem
              label="Venda"
              value={
                item.venda ? (
                  <Link
                    href={`/${tenantSlug}/vendas/${item.venda.id}`}
                    className="text-emerald-700 hover:underline dark:text-emerald-300"
                  >
                    #{item.venda.numero}
                  </Link>
                ) : (
                  "—"
                )
              }
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
              value={
                item.conta_bancaria ? (
                  <Link
                    href={`/${tenantSlug}/financeiro/contas-bancarias/${item.conta_bancaria.id}`}
                    className="text-emerald-700 hover:underline dark:text-emerald-300"
                  >
                    {item.conta_bancaria.nome}
                  </Link>
                ) : (
                  "—"
                )
              }
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
              label="Valor recebido"
              value={formatCurrency(item.valor_recebido)}
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
              label="Recebimento"
              value={formatDateOnly(item.data_recebimento)}
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
