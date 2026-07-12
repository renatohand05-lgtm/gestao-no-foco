import Link from "next/link";

import { ContaReceberCancelButton } from "@/components/financeiro/conta-receber-cancel-button";
import { ContaReceberDeleteButton } from "@/components/financeiro/conta-receber-delete-button";
import { ContaReceberReceberButton } from "@/components/financeiro/conta-receber-receber-button";
import { ContaReceberStatusBadge } from "@/components/financeiro/conta-receber-status-badge";
import { ModuleHeader } from "@/components/layout/module-header";
import { ActionButton } from "@/components/ui/action-button";
import { FormGrid } from "@/components/ui/form-grid";
import { SectionCard } from "@/components/ui/section-card";
import {
  calcSaldoPendente,
  calcValorLiquido,
  canCancelarContaReceber,
  canEditClassificacaoContaReceber,
  canEditContaReceber,
  canReceberContaReceber,
  formatContaReceberNumero,
} from "@/lib/financeiro/conta-receber-utils";
import { formatCurrency, formatDateOnly, formatFinanceiroDate } from "@/lib/financeiro/format";
import type { ContaReceberDetail } from "@/types/contas-receber";

type Props = {
  tenantSlug: string;
  item: ContaReceberDetail;
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

export function ContaReceberDetail({
  tenantSlug,
  item,
  contasBancarias,
}: Props) {
  const valorLiquido = calcValorLiquido(item);
  const saldo = calcSaldoPendente(item);

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
        {canCancelarContaReceber(item) ? (
          <ContaReceberCancelButton
            tenantSlug={tenantSlug}
            id={item.id}
            descricao={item.descricao}
          />
        ) : null}
        {item.status === "cancelado" ? (
          <ContaReceberDeleteButton
            tenantSlug={tenantSlug}
            id={item.id}
            descricao={item.descricao}
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
      </div>
    </div>
  );
}
