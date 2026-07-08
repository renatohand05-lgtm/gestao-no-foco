import Link from "next/link";
import { Clock3, FileText } from "lucide-react";

import { VendaCancelarButton } from "@/components/vendas/venda-cancelar-button";
import { VendaDeleteButton } from "@/components/vendas/venda-delete-button";
import { VendaFaturarButton } from "@/components/vendas/venda-faturar-button";
import { VendaStatusBadge } from "@/components/vendas/venda-status-badge";
import { ActionButton } from "@/components/ui/action-button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormGrid } from "@/components/ui/form-grid";
import { SectionCard } from "@/components/ui/section-card";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency, formatVendaDate, formatVendaNumero } from "@/lib/vendas/format";
import type { VendasAbertasView } from "@/types/vendas";

type VendaOpenViewProps = {
  tenantSlug: string;
  view: VendasAbertasView;
  hasSearch?: boolean;
  searchTerm?: string;
};

function ResumoItem({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={strong ? "text-sm font-semibold" : "text-sm"}>{value}</p>
    </div>
  );
}

export function VendaOpenView({
  tenantSlug,
  view,
  hasSearch = false,
  searchTerm,
}: VendaOpenViewProps) {
  const baseUrl = `/${tenantSlug}/vendas/abertas`;
  const qParam = searchTerm?.trim();
  const baseWithQ = qParam ? `${baseUrl}?q=${encodeURIComponent(qParam)}` : baseUrl;

  function buildRedirectWithSuccess(success: string) {
    const sep = qParam ? "&" : "?";
    return `${baseWithQ}${sep}success=${encodeURIComponent(success)}`;
  }

  if (view.items.length === 0) {
    const title = hasSearch
      ? "Nenhuma venda aberta encontrada"
      : "Nenhuma venda aberta";

    const description = hasSearch
      ? `Não encontramos vendas abertas para "${searchTerm ?? ""}".`
      : "Não há vendas em status orçamento ou em andamento neste tenant.";

    return (
      <EmptyState
        icon={Clock3}
        title={title}
        description={description}
        action={{
          label: "Nova venda",
          href: `/${tenantSlug}/vendas/nova`,
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Resumo das vendas abertas"
        description="Orçamentos e vendas em andamento não baixam estoque até o faturamento."
      >
        <FormGrid columns={4}>
          <ResumoItem label="Quantidade" value={view.resumo.quantidade} strong />
          <ResumoItem
            label="Subtotal"
            value={formatCurrency(view.resumo.subtotal)}
            strong
          />
          <ResumoItem
            label="Desconto por item"
            value={formatCurrency(view.resumo.desconto_itens)}
          />
          <ResumoItem
            label="Desconto total"
            value={formatCurrency(view.resumo.desconto_total)}
          />
          <ResumoItem
            label="Total geral"
            value={formatCurrency(view.resumo.total_geral)}
            strong
          />
          <ResumoItem
            label="Margem estimada"
            value={formatCurrency(view.resumo.margem_estimada)}
          />
          <ResumoItem
            label="Orçamentos"
            value={view.resumo.por_status.orcamento}
          />
          <ResumoItem
            label="Em andamento"
            value={view.resumo.por_status.em_andamento}
          />
        </FormGrid>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        {view.items.map((venda) => (
          <Card
            key={venda.id}
            className="border-border/60 bg-card/80 shadow-sm ring-1 ring-foreground/5"
          >
            <CardHeader>
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Link
                    href={`/${tenantSlug}/vendas/${venda.id}`}
                    className="hover:underline"
                  >
                    {formatVendaNumero(venda.numero)}
                  </Link>
                  <VendaStatusBadge status={venda.status} />
                </CardTitle>
                <CardDescription>
                  {venda.cliente.nome} • {formatVendaDate(venda.data_venda)}
                </CardDescription>
              </div>
              <CardAction>
                <ActionButton
                  action="view"
                  size="sm"
                  href={`/${tenantSlug}/vendas/${venda.id}`}
                />
              </CardAction>
            </CardHeader>

            <CardContent className="space-y-5">
              <FormGrid columns={3}>
                <ResumoItem
                  label="Subtotal"
                  value={formatCurrency(venda.resumo.subtotal)}
                />
                <ResumoItem
                  label="Desconto por item"
                  value={formatCurrency(venda.resumo.desconto_itens)}
                />
                <ResumoItem
                  label="Desconto total"
                  value={formatCurrency(venda.resumo.desconto_total)}
                />
                <ResumoItem
                  label="Total geral"
                  value={formatCurrency(venda.resumo.total_geral)}
                  strong
                />
                <ResumoItem
                  label="Margem estimada"
                  value={formatCurrency(venda.resumo.margem_estimada)}
                />
                <ResumoItem
                  label="Itens"
                  value={`${venda.itens.length} item${venda.itens.length === 1 ? "" : "s"}`}
                />
              </FormGrid>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Itens e descontos
                </p>
                <div className="space-y-2">
                  {venda.itens.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.descricao}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantidade} x {formatCurrency(item.preco_unitario)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatCurrency(item.total)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Desc. item: {formatCurrency(item.desconto)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Regras do status atual
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
                    Não baixa estoque neste status
                  </span>
                  <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                    Estoque só movimenta ao faturar
                  </span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-wrap justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="size-3.5" />
                Ações disponíveis para {venda.status === "orcamento" ? "orçamento" : "venda em andamento"}
              </div>
              <div className="flex flex-wrap gap-2">
                {venda.acoes_disponiveis.includes("editar") ? (
                  <ActionButton
                    action="edit"
                    size="sm"
                    href={`/${tenantSlug}/vendas/${venda.id}/editar`}
                  />
                ) : null}
                {venda.acoes_disponiveis.includes("faturar") ? (
                  <VendaFaturarButton
                    tenantSlug={tenantSlug}
                    vendaId={venda.id}
                    vendaNumero={venda.numero}
                    redirectTo={buildRedirectWithSuccess("faturado")}
                  />
                ) : null}
                {venda.acoes_disponiveis.includes("cancelar") ? (
                  <VendaCancelarButton
                    tenantSlug={tenantSlug}
                    vendaId={venda.id}
                    vendaNumero={venda.numero}
                    isFaturado={false}
                    redirectTo={buildRedirectWithSuccess("cancelado")}
                  />
                ) : null}
                {venda.acoes_disponiveis.includes("excluir") ? (
                  <VendaDeleteButton
                    tenantSlug={tenantSlug}
                    vendaId={venda.id}
                    vendaNumero={venda.numero}
                    redirectTo={buildRedirectWithSuccess("deleted")}
                  />
                ) : null}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
