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
import { ContaPagarPagarDialog } from "@/components/financeiro/conta-pagar-pagar-dialog";
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
  canCancelarContaPagar,
  canEditClassificacaoContaPagar,
  canEditContaPagar,
  canEstornarContaPagar,
  canPagarContaPagar,
  resolveFornecedorNome,
  resolveStatusExibicao,
} from "@/lib/financeiro/conta-pagar-utils";
import type { ContaPagarDetail, ContaPagarListItem } from "@/types/contas-pagar";

type Props = {
  tenantSlug: string;
  item: ContaPagarListItem | ContaPagarDetail;
  formasPagamento?: { id: string; nome: string }[];
  contasBancarias?: { id: string; nome: string }[];
};

function toSnapshot(
  item: ContaPagarListItem | ContaPagarDetail,
): ContaLifecycleSnapshot {
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
    despesa_recorrente_id:
      "despesa_recorrente_id" in item
        ? ((item as { despesa_recorrente_id?: string | null })
            .despesa_recorrente_id ?? null)
        : null,
  };
}

export function ContaPagarRowActions({
  tenantSlug,
  item,
  formasPagamento = [],
  contasBancarias = [],
}: Props) {
  const [openPagar, setOpenPagar] = useState(false);
  const [openCancelar, setOpenCancelar] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openEstornar, setOpenEstornar] = useState(false);
  const { duplicar, isPending: duplicando } = useDuplicarConta(
    "pagar",
    tenantSlug,
  );

  const snapshot = useMemo(() => toSnapshot(item), [item]);

  const podePagar = canPagarContaPagar(item);
  const podeEditar = canEditContaPagar(item);
  const podeCorrigirClassificacao =
    !podeEditar && canEditClassificacaoContaPagar(item);
  const podeCancelar = canCancelarContaPagar(item);
  const podeEstornar = canEstornarContaPagar(item);

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
              <Link href={`/${tenantSlug}/financeiro/contas-pagar/${item.id}`} />
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
                      ? `/${tenantSlug}/financeiro/contas-pagar/${item.id}/editar?classificacaoOnly=true`
                      : `/${tenantSlug}/financeiro/contas-pagar/${item.id}/editar`
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
                href={`/${tenantSlug}/financeiro/contas-pagar/${item.id}#historico`}
              />
            }
          >
            <History className="mr-2 size-4" />
            Ver histórico
          </DropdownMenuItem>
          {podePagar ? (
            <DropdownMenuItem onClick={() => setOpenPagar(true)}>
              <CheckCircle2 className="mr-2 size-4" />
              Registrar pagamento
            </DropdownMenuItem>
          ) : null}
          {podeEstornar ? (
            <DropdownMenuItem onClick={() => setOpenEstornar(true)}>
              <RotateCcw className="mr-2 size-4" />
              Estornar pagamento
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

      <ContaPagarPagarDialog
        open={openPagar}
        onOpenChange={setOpenPagar}
        tenantSlug={tenantSlug}
        item={item}
        formasPagamento={formasPagamento}
        contasBancarias={contasBancarias}
      />
      <ContaLifecycleCancelDialog
        open={openCancelar}
        onOpenChange={setOpenCancelar}
        tenantSlug={tenantSlug}
        kind="pagar"
        snapshot={snapshot}
      />
      <ContaLifecycleDeleteDialog
        open={openDelete}
        onOpenChange={setOpenDelete}
        tenantSlug={tenantSlug}
        kind="pagar"
        snapshot={snapshot}
      />
      <ContaLifecycleEstornoDialog
        open={openEstornar}
        onOpenChange={setOpenEstornar}
        tenantSlug={tenantSlug}
        kind="pagar"
        snapshot={snapshot}
      />
    </>
  );
}
