"use client";

import Link from "next/link";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { VendaDeleteDialog } from "@/components/vendas/venda-delete-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VENDA_STATUS_EDITAVEIS } from "@/lib/vendas/constants";
import type { VendaListItem } from "@/types/vendas";

type VendaRowActionsProps = {
  tenantSlug: string;
  venda: VendaListItem;
  deleteRedirectTo?: string;
};

export function VendaRowActions({
  tenantSlug,
  venda,
  deleteRedirectTo,
}: VendaRowActionsProps) {
  const [openDelete, setOpenDelete] = useState(false);
  const canEdit = VENDA_STATUS_EDITAVEIS.includes(
    venda.status as (typeof VENDA_STATUS_EDITAVEIS)[number],
  );

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
            render={<Link href={`/${tenantSlug}/vendas/${venda.id}`} />}
          >
            <Eye className="mr-2 size-4" />
            Ver detalhes
          </DropdownMenuItem>
          {canEdit ? (
            <DropdownMenuItem
              render={
                <Link href={`/${tenantSlug}/vendas/${venda.id}/editar`} />
              }
            >
              <Pencil className="mr-2 size-4" />
              Editar
            </DropdownMenuItem>
          ) : null}
          {canEdit ? (
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

      {canEdit ? (
        <VendaDeleteDialog
          open={openDelete}
          onOpenChange={setOpenDelete}
          tenantSlug={tenantSlug}
          vendaId={venda.id}
          vendaNumero={venda.numero}
          redirectTo={deleteRedirectTo}
        />
      ) : null}
    </>
  );
}
