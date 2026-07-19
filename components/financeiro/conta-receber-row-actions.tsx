"use client";

import Link from "next/link";
import {
  Ban,
  CheckCircle2,
  Copy,
  Eye,
  History,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  ContaLifecycleCancelDialog,
  ContaLifecycleDeleteDialog,
  ContaLifecycleEstornoDialog,
  useDuplicarConta,
} from "@/components/financeiro/conta-lifecycle-dialogs";
import { ContaReceberReceberDialog } from "@/components/financeiro/conta-receber-receber-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ContaLifecycleSnapshot } from "@/lib/financeiro/conta-lifecycle";
import {
  canCancelarContaReceber,
  canEditClassificacaoContaReceber,
  canEditContaReceber,
  canEstornarContaReceber,
  canReceberContaReceber,
  resolveStatusExibicao,
} from "@/lib/financeiro/conta-receber-utils";
import type {
  ContaReceberDetail,
  ContaReceberListItem,
} from "@/types/contas-receber";

type Props = {
  tenantSlug: string;
  item: ContaReceberListItem | ContaReceberDetail;
  contasBancarias: { id: string; nome: string }[];
};

function counterpartyName(item: ContaReceberListItem | ContaReceberDetail) {
  if ("cliente" in item && item.cliente?.nome) return item.cliente.nome;
  return "—";
}

function toSnapshot(
  item: ContaReceberListItem | ContaReceberDetail,
): ContaLifecycleSnapshot {
  return {
    id: item.id,
    numero: item.numero,
    descricao: item.descricao,
    status: resolveStatusExibicao(item),
    valor_original: item.valor_original,
    valor_liquidado: item.valor_recebido,
    data_competencia: item.data_competencia,
    data_vencimento: item.data_vencimento,
    counterparty: counterpartyName(item),
    grupo_parcelamento_id: item.grupo_parcelamento_id,
    parcela_numero: item.parcela_numero,
    parcela_total: item.parcela_total,
    venda_id: item.venda_id,
  };
}

export function ContaReceberRowActions({
  tenantSlug,
  item,
  contasBancarias,
}: Props) {
  const [openReceber, setOpenReceber] = useState(false);
  const [openCancelar, setOpenCancelar] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openEstornar, setOpenEstornar] = useState(false);
  const { duplicar, isPending: duplicando } = useDuplicarConta(
    "receber",
    tenantSlug,
  );

  const snapshot = useMemo(() => toSnapshot(item), [item]);

  const podeReceber = canReceberContaReceber(item);
  const podeEditar = canEditContaReceber(item);
  const podeCorrigirClassificacao =
    !podeEditar && canEditClassificacaoContaReceber(item);
  const podeCancelar = canCancelarContaReceber(item);
  const podeEstornar = canEstornarContaReceber(item);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            render={
              <Link
                href={`/${tenantSlug}/financeiro/contas-receber/${item.id}`}
              />
            }
          >
            <Eye className="mr-2 size-4" />
            Visualizar
          </DropdownMenuItem>
          {podeEditar || podeCorrigirClassificacao ? (
            <DropdownMenuItem
              render={
                <Link
                  href={
                    podeCorrigirClassificacao
                      ? `/${tenantSlug}/financeiro/contas-receber/${item.id}/editar?classificacaoOnly=true`
                      : `/${tenantSlug}/financeiro/contas-receber/${item.id}/editar`
                  }
                />
              }
            >
              <Pencil className="mr-2 size-4" />
              {podeCorrigirClassificacao
                ? "Corrigir classificação"
                : "Editar"}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            disabled={duplicando}
            onClick={() => duplicar(item.id)}
          >
            <Copy className="mr-2 size-4" />
            Duplicar
          </DropdownMenuItem>
          <DropdownMenuItem
            render={
              <Link
                href={`/${tenantSlug}/financeiro/contas-receber/${item.id}#historico`}
              />
            }
          >
            <History className="mr-2 size-4" />
            Ver histórico
          </DropdownMenuItem>
          {podeReceber ? (
            <DropdownMenuItem onClick={() => setOpenReceber(true)}>
              <CheckCircle2 className="mr-2 size-4" />
              Registrar recebimento
            </DropdownMenuItem>
          ) : null}
          {podeEstornar ? (
            <DropdownMenuItem onClick={() => setOpenEstornar(true)}>
              <RotateCcw className="mr-2 size-4" />
              Estornar recebimento
            </DropdownMenuItem>
          ) : null}
          {podeCancelar || podeEstornar ? (
            <DropdownMenuItem
              onClick={() => setOpenCancelar(true)}
              disabled={!podeCancelar}
            >
              <Ban className="mr-2 size-4" />
              Cancelar
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setOpenDelete(true)}
          >
            <Trash2 className="mr-2 size-4" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ContaReceberReceberDialog
        open={openReceber}
        onOpenChange={setOpenReceber}
        tenantSlug={tenantSlug}
        item={item}
        contasBancarias={contasBancarias}
      />
      <ContaLifecycleCancelDialog
        open={openCancelar}
        onOpenChange={setOpenCancelar}
        tenantSlug={tenantSlug}
        kind="receber"
        snapshot={snapshot}
      />
      <ContaLifecycleDeleteDialog
        open={openDelete}
        onOpenChange={setOpenDelete}
        tenantSlug={tenantSlug}
        kind="receber"
        snapshot={snapshot}
      />
      <ContaLifecycleEstornoDialog
        open={openEstornar}
        onOpenChange={setOpenEstornar}
        tenantSlug={tenantSlug}
        kind="receber"
        snapshot={snapshot}
      />
    </>
  );
}
