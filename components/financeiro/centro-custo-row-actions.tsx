"use client";

import Link from "next/link";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { CentroCustoDeleteDialog } from "@/components/financeiro/centro-custo-delete-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CentroCustoListItem } from "@/types/financeiro";

type Props = {
  tenantSlug: string;
  item: CentroCustoListItem;
};

export function CentroCustoRowActions({ tenantSlug, item }: Props) {
  const [openDelete, setOpenDelete] = useState(false);

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
              <Link href={`/${tenantSlug}/financeiro/centros-custo/${item.id}`} />
            }
          >
            <Eye className="mr-2 size-4" />
            Ver detalhes
          </DropdownMenuItem>
          <DropdownMenuItem
            render={
              <Link
                href={`/${tenantSlug}/financeiro/centros-custo/${item.id}/editar`}
              />
            }
          >
            <Pencil className="mr-2 size-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setOpenDelete(true)}
          >
            <Trash2 className="mr-2 size-4" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CentroCustoDeleteDialog
        open={openDelete}
        onOpenChange={setOpenDelete}
        tenantSlug={tenantSlug}
        id={item.id}
        nome={item.nome}
      />
    </>
  );
}
