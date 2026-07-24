"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  ClipboardPlus,
  Download,
  FileSpreadsheet,
  FileText,
  PackagePlus,
  Printer,
  Share2,
  ShoppingCart,
  UserPlus,
  Wallet,
  CalendarPlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DsIcon } from "@/components/ui/ds-icon";
import { gofFocusRing, gofMotion, gofRadius } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type QuickCreate = {
  id: string;
  label: string;
  href: (slug: string) => string;
  icon: typeof ShoppingCart;
};

const CREATE_ITEMS: QuickCreate[] = [
  {
    id: "criar_os",
    label: "Criar OS",
    href: (s) => `/${s}/ordens/nova`,
    icon: ClipboardPlus,
  },
  {
    id: "nova_venda",
    label: "Nova Venda",
    href: (s) => `/${s}/vendas/nova`,
    icon: ShoppingCart,
  },
  {
    id: "novo_cliente",
    label: "Novo Cliente",
    href: (s) => `/${s}/clientes/novo`,
    icon: UserPlus,
  },
  {
    id: "novo_produto",
    label: "Novo Produto",
    href: (s) => `/${s}/produtos/novo`,
    icon: PackagePlus,
  },
  {
    id: "nova_conta",
    label: "Nova Conta",
    href: (s) => `/${s}/financeiro/contas-bancarias/novo`,
    icon: Wallet,
  },
  {
    id: "nova_agenda",
    label: "Nova Agenda",
    href: (s) => `/${s}/clientes/agenda`,
    icon: CalendarPlus,
  },
];

const EXPORT_ITEMS = [
  { id: "pdf", label: "PDF", icon: FileText },
  { id: "excel", label: "Excel", icon: FileSpreadsheet },
  { id: "csv", label: "CSV", icon: Download },
  { id: "imprimir", label: "Imprimir", icon: Printer },
  { id: "compartilhar", label: "Compartilhar", icon: Share2 },
] as const;

function resolveTenantSlug(pathname: string | null): string | null {
  if (!pathname) return null;
  const part = pathname.split("/").filter(Boolean)[0];
  if (!part || part === "login" || part === "register" || part === "onboarding") {
    return null;
  }
  return part;
}

/**
 * Ações rápidas Enterprise — Design System oficial (Gate 19.4.1).
 */
export function ExecutiveQuickActions() {
  const pathname = usePathname();
  const router = useRouter();
  const tenantSlug = resolveTenantSlug(pathname);

  return (
    <div
      className={cn("flex items-center gap-1.5", gofMotion.fade)}
      aria-label="Ações principais"
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              size="sm"
              className={cn(
                "bg-[var(--brand-graphite)] text-white hover:bg-[var(--brand-graphite)]/90",
                gofRadius.lg,
                gofFocusRing,
              )}
            >
              Novo
              <DsIcon
                icon={ChevronDown}
                size="xs"
                className="ml-1 opacity-80"
              />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-48">
          {CREATE_ITEMS.map((action) => (
            <DropdownMenuItem
              key={action.id}
              disabled={!tenantSlug}
              onClick={() => {
                if (tenantSlug) router.push(action.href(tenantSlug));
              }}
            >
              <DsIcon icon={action.icon} size="sm" className="mr-2 opacity-70" />
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
                "border-border/60 bg-[var(--brand-white)]",
                gofRadius.lg,
                gofFocusRing,
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
        <DropdownMenuContent align="end" className="min-w-40">
          {EXPORT_ITEMS.map((item) => (
            <DropdownMenuItem
              key={item.id}
              onClick={() => {
                if (item.id === "imprimir" && typeof window !== "undefined") {
                  window.print();
                }
              }}
            >
              <DsIcon icon={item.icon} size="sm" className="mr-2 opacity-70" />
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
