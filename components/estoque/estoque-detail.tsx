"use client";

import { useState } from "react";
import Link from "next/link";

import { EstoqueDeleteDialog } from "@/components/estoque/estoque-delete-dialog";
import { EstoqueTipoBadge } from "@/components/estoque/estoque-tipo-badge";
import { ModuleHeader } from "@/components/layout/module-header";
import { ActionButton } from "@/components/ui/action-button";
import { FormGrid } from "@/components/ui/form-grid";
import { SectionCard } from "@/components/ui/section-card";
import {
  formatMovimentacaoDate,
  formatQuantity,
  getMovimentacaoTipoLabel,
  getOrigemLabel,
} from "@/lib/estoque/format";
import type { EstoqueMovimentacaoDetail } from "@/types/estoque";

type EstoqueDetailProps = {
  tenantSlug: string;
  movimentacao: EstoqueMovimentacaoDetail;
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

export function EstoqueDetail({
  tenantSlug,
  movimentacao,
}: EstoqueDetailProps) {
  const [openDelete, setOpenDelete] = useState(false);
  const produtoNome = movimentacao.produto?.nome ?? "Produto";

  return (
    <div className="space-y-6">
      <ModuleHeader
        title={`Movimentação — ${produtoNome}`}
        description={getMovimentacaoTipoLabel(movimentacao.tipo)}
        breadcrumbs={[
          { label: "Estoque", href: `/${tenantSlug}/estoque` },
          { label: produtoNome },
        ]}
      >
        <EstoqueTipoBadge tipo={movimentacao.tipo} />
        {movimentacao.produto ? (
          <ActionButton
            action="view"
            label="Ver produto"
            href={`/${tenantSlug}/produtos/${movimentacao.produto_id}`}
          />
        ) : null}
        <ActionButton action="delete" onClick={() => setOpenDelete(true)} />
      </ModuleHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Produto">
          <FormGrid>
            <DetailItem label="Produto" value={produtoNome} />
            <DetailItem
              label="SKU"
              value={movimentacao.produto?.sku || "—"}
            />
            <DetailItem
              label="Unidade"
              value={movimentacao.produto?.unidade_medida || "—"}
            />
          </FormGrid>
        </SectionCard>

        <SectionCard title="Movimentação">
          <FormGrid>
            <DetailItem label="Tipo" value={getMovimentacaoTipoLabel(movimentacao.tipo)} />
            <DetailItem label="Origem" value={getOrigemLabel(movimentacao.origem)} />
            <DetailItem
              label="Quantidade"
              value={formatQuantity(
                movimentacao.quantidade,
                movimentacao.produto?.unidade_medida,
              )}
            />
            <DetailItem
              label="Estoque anterior"
              value={formatQuantity(
                movimentacao.quantidade_anterior,
                movimentacao.produto?.unidade_medida,
              )}
            />
            <DetailItem
              label="Estoque final"
              value={formatQuantity(
                movimentacao.quantidade_nova,
                movimentacao.produto?.unidade_medida,
              )}
            />
            <DetailItem label="Motivo" value={movimentacao.motivo || "—"} />
          </FormGrid>
        </SectionCard>

        <SectionCard title="Auditoria" className="lg:col-span-2">
          <FormGrid>
            <DetailItem
              label="Registrado em"
              value={formatMovimentacaoDate(movimentacao.created_at)}
            />
            <DetailItem
              label="Registrado por"
              value={
                movimentacao.created_by_profile?.full_name ||
                movimentacao.created_by_profile?.email ||
                "—"
              }
            />
          </FormGrid>
          <p className="mt-4 text-sm text-muted-foreground">
            {movimentacao.observacoes || "Nenhuma observação registrada."}
          </p>
          {movimentacao.produto ? (
            <div className="mt-4">
              <Link
                href={`/${tenantSlug}/produtos/${movimentacao.produto_id}`}
                className="text-sm text-primary hover:underline"
              >
                Abrir cadastro do produto
              </Link>
            </div>
          ) : null}
        </SectionCard>
      </div>

      <EstoqueDeleteDialog
        open={openDelete}
        onOpenChange={setOpenDelete}
        tenantSlug={tenantSlug}
        movimentacaoId={movimentacao.id}
        produtoNome={produtoNome}
      />
    </div>
  );
}
