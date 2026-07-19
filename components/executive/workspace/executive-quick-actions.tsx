"use client";

import { ChevronDown, Download, FileSpreadsheet, FileText, Plus, Printer, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DsIcon } from "@/components/ui/ds-icon";
import { exAnimations, exSize } from "@/lib/design-system";
import { listWorkspaceQuickActions } from "@/lib/workspace";
import { cn } from "@/lib/utils";

const CREATE_IDS = [
  "nova_venda",
  "nova_conta",
  "nova_meta",
  "novo_cliente",
  "novo_produto",
  "nova_categoria",
] as const;

const EXPORT_ITEMS = [
  { id: "pdf", label: "PDF", icon: FileText },
  { id: "excel", label: "Excel", icon: FileSpreadsheet },
  { id: "csv", label: "CSV", icon: Download },
  { id: "imprimir", label: "Imprimir", icon: Printer },
  { id: "compartilhar", label: "Compartilhar", icon: Share2 },
] as const;

/**
 * Apenas Novo + Exportar (Sprint 12.4).
 */
export function ExecutiveQuickActions() {
  const create = listWorkspaceQuickActions().filter((a) =>
    (CREATE_IDS as readonly string[]).includes(a.id),
  );

  return (
    <div
      className={cn("flex items-center gap-1.5", exAnimations.fade)}
      aria-label="Ações principais"
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              size="sm"
              className={cn(
                "rounded-xl bg-blue-600 text-white hover:bg-blue-600/90",
                exAnimations.focusRing,
                exAnimations.hoverPress,
              )}
            >
              <DsIcon icon={Plus} size="sm" className="mr-1 text-white" />
              Novo
              <DsIcon
                icon={ChevronDown}
                size="xs"
                className="ml-1 opacity-80"
              />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className={exSize.menu}>
          {create.map((action) => (
            <DropdownMenuItem key={action.id} onClick={() => {}}>
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "rounded-xl border-slate-200 bg-white dark:border-white/10",
                exAnimations.focusRing,
              )}
            >
              <DsIcon icon={Download} size="sm" className="mr-1" />
              Exportar
              <DsIcon
                icon={ChevronDown}
                size="xs"
                className="ml-1 opacity-70"
              />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className={exSize.menu}>
          {EXPORT_ITEMS.map((item) => (
            <DropdownMenuItem key={item.id} onClick={() => {}}>
              <DsIcon icon={item.icon} size="sm" className="mr-2 opacity-70" />
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
