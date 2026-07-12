"use client";

import Link from "next/link";
import { Ban, CheckCircle2, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { ContaReceberCancelDialog } from "@/components/financeiro/conta-receber-cancel-dialog";
import { ContaReceberDeleteDialog } from "@/components/financeiro/conta-receber-delete-dialog";
import { ContaReceberReceberDialog } from "@/components/financeiro/conta-receber-receber-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  canCancelarContaReceber,
  canEditClassificacaoContaReceber,
  canEditContaReceber,
  canReceberContaReceber,
} from "@/lib/financeiro/conta-receber-utils";
import type { ContaReceberDetail, ContaReceberListItem } from "@/types/contas-receber";

type Props = {
  tenantSlug: string;
  item: ContaReceberListItem | ContaReceberDetail;
  contasBancarias: { id: string; nome: string }[];
};

export function ContaReceberRowActions({
  tenantSlug,
  item,
  contasBancarias,
}: Props) {
  const [openReceber, setOpenReceber] = useState(false);
  const [openCancelar, setOpenCancelar] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

  const podeReceber = canReceberContaReceber(item);
  const podeEditar = canEditContaReceber(item);
  const podeCorrigirClassificacao =
    !podeEditar && canEditClassificacaoContaReceber(item);
  const podeCancelar = canCancelarContaReceber(item);
  const podeExcluir = item.status === "cancelado";

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
              <Link href={`/${tenantSlug}/financeiro/contas-receber/${item.id}`} />
            }
          >
            <Eye className="mr-2 size-4" />
            Ver detalhes
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
          {podeReceber ? (
            <DropdownMenuItem onClick={() => setOpenReceber(true)}>
              <CheckCircle2 className="mr-2 size-4" />
              Registrar recebimento
            </DropdownMenuItem>
          ) : null}
          {podeCancelar ? (
            <DropdownMenuItem onClick={() => setOpenCancelar(true)}>
              <Ban className="mr-2 size-4" />
              Cancelar
            </DropdownMenuItem>
          ) : null}
          {podeExcluir ? (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setOpenDelete(true)}
            >
              <Trash2 className="mr-2 size-4" />
              Excluir
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <ContaReceberReceberDialog
        open={openReceber}
        onOpenChange={setOpenReceber}
        tenantSlug={tenantSlug}
        item={item}
        contasBancarias={contasBancarias}
      />
      <ContaReceberCancelDialog
        open={openCancelar}
        onOpenChange={setOpenCancelar}
        tenantSlug={tenantSlug}
        id={item.id}
        descricao={item.descricao}
      />
      <ContaReceberDeleteDialog
        open={openDelete}
        onOpenChange={setOpenDelete}
        tenantSlug={tenantSlug}
        id={item.id}
        descricao={item.descricao}
      />
    </>
  );
}
