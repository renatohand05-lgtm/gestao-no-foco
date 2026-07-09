import Link from "next/link";

import { ModuleHeader } from "@/components/layout/module-header";
import { VendaCancelarButton } from "@/components/vendas/venda-cancelar-button";
import { VendaDeleteButton } from "@/components/vendas/venda-delete-button";
import { VendaFaturarButton } from "@/components/vendas/venda-faturar-button";
import { VendaStatusBadge } from "@/components/vendas/venda-status-badge";
import { ActionButton } from "@/components/ui/action-button";
import { FormGrid } from "@/components/ui/form-grid";
import { SectionCard } from "@/components/ui/section-card";
import {
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
import { VENDA_STATUS_EDITAVEIS } from "@/lib/vendas/constants";
import {
  formatCurrency,
  formatQuantity,
  formatVendaDate,
  formatVendaDateTime,
  formatVendaNumero,
  resolveFormaPagamentoDisplay,
} from "@/lib/vendas/format";
import { PRODUTO_TIPOS_SEM_ESTOQUE } from "@/lib/estoque/constants";
import type { VendaDetail } from "@/types/vendas";

type VendaDetailProps = {
  tenantSlug: string;
  venda: VendaDetail;
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

export function VendaDetailView({ tenantSlug, venda }: VendaDetailProps) {
  const canEdit = VENDA_STATUS_EDITAVEIS.includes(
    venda.status as (typeof VENDA_STATUS_EDITAVEIS)[number],
  );
  const canFaturar =
    venda.status === "orcamento" || venda.status === "em_andamento";
  const canCancelar = venda.status !== "cancelado";

  return (
    <div className="space-y-6">
      <ModuleHeader
        title={formatVendaNumero(venda.numero)}
        description={`Venda de ${venda.cliente.nome}`}
        breadcrumbs={[
          { label: "Vendas", href: `/${tenantSlug}/vendas` },
          { label: formatVendaNumero(venda.numero) },
        ]}
      >
        <VendaStatusBadge status={venda.status} />
        {canFaturar ? (
          <VendaFaturarButton
            tenantSlug={tenantSlug}
            vendaId={venda.id}
            vendaNumero={venda.numero}
          />
        ) : null}
        {canCancelar ? (
          <VendaCancelarButton
            tenantSlug={tenantSlug}
            vendaId={venda.id}
            vendaNumero={venda.numero}
            isFaturado={venda.status === "faturado"}
          />
        ) : null}
        {canEdit ? (
          <ActionButton
            action="edit"
            href={`/${tenantSlug}/vendas/${venda.id}/editar`}
          />
        ) : null}
        {canEdit ? (
          <VendaDeleteButton
            tenantSlug={tenantSlug}
            vendaId={venda.id}
            vendaNumero={venda.numero}
          />
        ) : null}
      </ModuleHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Cliente">
          <FormGrid>
            <DetailItem
              label="Nome"
              value={
                <Link
                  href={`/${tenantSlug}/clientes/${venda.cliente.id}`}
                  className="hover:underline"
                >
                  {venda.cliente.nome}
                </Link>
              }
            />
            <DetailItem
              label="Documento"
              value={venda.cliente.documento || "—"}
            />
            <DetailItem label="E-mail" value={venda.cliente.email || "—"} />
            <DetailItem label="Telefone" value={venda.cliente.telefone || "—"} />
          </FormGrid>
        </SectionCard>

        <SectionCard title="Resumo financeiro">
          <FormGrid>
            <DetailItem label="Data" value={formatVendaDate(venda.data_venda)} />
            <DetailItem label="Status atual" value={<VendaStatusBadge status={venda.status} />} />
            <DetailItem
              label="Forma de pagamento"
              value={resolveFormaPagamentoDisplay(venda)}
            />
            {venda.categoria_financeira_ref ? (
              <DetailItem
                label="Categoria financeira"
                value={venda.categoria_financeira_ref.nome}
              />
            ) : null}
            {venda.centro_custo_ref ? (
              <DetailItem
                label="Centro de custo"
                value={`${venda.centro_custo_ref.codigo} · ${venda.centro_custo_ref.nome}`}
              />
            ) : null}
            {(venda.quantidade_parcelas ?? 1) > 1 ? (
              <DetailItem
                label="Parcelas"
                value={`${venda.quantidade_parcelas} parcela(s)`}
              />
            ) : null}
            <DetailItem label="Subtotal" value={formatCurrency(venda.subtotal)} />
            <DetailItem
              label="Desconto total"
              value={formatCurrency(venda.desconto_total)}
            />
            <DetailItem
              label="Total"
              value={
                <span className="font-semibold">{formatCurrency(venda.total)}</span>
              }
            />
            <DetailItem
              label="Margem"
              value={formatCurrency(venda.margem_total)}
            />
          </FormGrid>
        </SectionCard>
      </div>

      {(venda.status === "orcamento" || venda.status === "em_andamento") ? (
        <SectionCard
          title="Regras deste status"
          description="Enquanto a venda estiver aberta, não há baixa de estoque."
        >
          <FormGrid columns={3}>
            <DetailItem label="Baixa de estoque" value="Somente no faturamento" />
            <DetailItem
              label="Cancelamento"
              value="Não estorna estoque porque ainda não foi faturada"
            />
            <DetailItem
              label="Ações disponíveis"
              value="Editar, faturar, cancelar e excluir"
            />
          </FormGrid>
        </SectionCard>
      ) : null}

      <SectionCard
        title="Itens"
        description={`${venda.itens.length} item${venda.itens.length === 1 ? "" : "s"} na venda`}
      >
        <DataTable>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden sm:table-cell">Qtd.</TableHead>
                <TableHead className="hidden md:table-cell">Preço unit.</TableHead>
                <TableHead className="hidden lg:table-cell">Desconto</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {venda.itens.map((item) => {
                const semEstoque = !PRODUTO_TIPOS_SEM_ESTOQUE.includes(
                  item.tipo_item as "servico",
                );

                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="font-medium">{item.descricao}</p>
                      {item.produto?.sku ? (
                        <p className="text-xs text-muted-foreground">
                          SKU: {item.produto.sku}
                        </p>
                      ) : null}
                      {item.produto && semEstoque ? (
                        <p className="text-xs text-muted-foreground">
                          Estoque atual:{" "}
                          {formatQuantity(
                            item.produto.estoque_atual,
                            item.produto.unidade_medida,
                          )}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {formatQuantity(
                        item.quantidade,
                        item.produto?.unidade_medida,
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {formatCurrency(item.preco_unitario)}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {formatCurrency(item.desconto)}
                    </TableCell>
                    <TableCell>{formatCurrency(item.total)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </DataTable>
      </SectionCard>

      {venda.observacoes ? (
        <SectionCard title="Observações">
          <p className="text-sm whitespace-pre-wrap">{venda.observacoes}</p>
        </SectionCard>
      ) : null}

      <SectionCard title="Auditoria">
        <FormGrid>
          <DetailItem
            label="Criado em"
            value={formatVendaDateTime(venda.created_at)}
          />
          <DetailItem
            label="Atualizado em"
            value={formatVendaDateTime(venda.updated_at)}
          />
          <DetailItem
            label="Registrado por"
            value={
              venda.created_by_profile?.full_name ||
              venda.created_by_profile?.email ||
              "—"
            }
          />
        </FormGrid>
      </SectionCard>
    </div>
  );
}
