"use client";

import Link from "next/link";
import { Ban, CheckCircle2, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { ContaPagarCancelDialog } from "@/components/financeiro/conta-pagar-cancel-dialog";
import { ContaPagarDeleteDialog } from "@/components/financeiro/conta-pagar-delete-dialog";
import { ContaPagarPagarDialog } from "@/components/financeiro/conta-pagar-pagar-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  canCancelarContaPagar,
  canEditContaPagar,
  canPagarContaPagar,
} from "@/lib/financeiro/conta-pagar-utils";
import type { ContaPagarDetail, ContaPagarListItem } from "@/types/contas-pagar";

type Props = {
  tenantSlug: string;
  item: ContaPagarListItem | ContaPagarDetail;
  formasPagamento?: { id: string; nome: string }[];
  contasBancarias?: { id: string; nome: string }[];
};

export function ContaPagarRowActions({
  tenantSlug,
  item,
  formasPagamento = [],
  contasBancarias = [],
}: Props) {
  const [openPagar, setOpenPagar] = useState(false);
  const [openCancelar, setOpenCancelar] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

  const podePagar = canPagarContaPagar(item);
  const podeEditar = canEditContaPagar(item);
  const podeCancelar = canCancelarContaPagar(item);
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
              <Link href={`/${tenantSlug}/financeiro/contas-pagar/${item.id}`} />
            }
          >
            <Eye className="mr-2 size-4" />
            Ver detalhes
          </DropdownMenuItem>
          {podeEditar ? (
            <DropdownMenuItem
              render={
                <Link
                  href={`/${tenantSlug}/financeiro/contas-pagar/${item.id}/editar`}
                />
              }
            >
              <Pencil className="mr-2 size-4" />
              Editar
            </DropdownMenuItem>
          ) : null}
          {podePagar ? (
            <DropdownMenuItem onClick={() => setOpenPagar(true)}>
              <CheckCircle2 className="mr-2 size-4" />
              Registrar pagamento
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

      <ContaPagarPagarDialog
        open={openPagar}
        onOpenChange={setOpenPagar}
        tenantSlug={tenantSlug}
        item={item}
        formasPagamento={formasPagamento}
        contasBancarias={contasBancarias}
      />
      <ContaPagarCancelDialog
        open={openCancelar}
        onOpenChange={setOpenCancelar}
        tenantSlug={tenantSlug}
        id={item.id}
        descricao={item.descricao}
      />
      <ContaPagarDeleteDialog
        open={openDelete}
        onOpenChange={setOpenDelete}
        tenantSlug={tenantSlug}
        id={item.id}
        descricao={item.descricao}
      />
    </>
  );
}
