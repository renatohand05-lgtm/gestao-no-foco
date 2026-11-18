"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarPlus,
  LayoutDashboard,
  Menu,
  Plus,
  ShoppingCart,
  UserPlus,
  Users,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { getTenantNav, type NavItem } from "@/config/navigation";
import { filterNavByPermissions } from "@/lib/navigation/filter-nav-by-permissions";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { TenantWithRole } from "@/types";

type Props = {
  tenant: TenantWithRole;
  permissions?: readonly string[];
  lockedNavIds?: readonly string[];
};

/** Rótulo curto para caber na barra (ex.: "Ordens de Serviço" → "OS"). */
function shortLabel(title: string): string {
  if (/ordens?\s+de\s+servi/i.test(title)) return "OS";
  if (title.length <= 10) return title;
  return title.split(" ")[0] ?? title;
}

type QuickAction = {
  key: string;
  label: string;
  hint: string;
  href: string;
  icon: LucideIcon;
  /** Gradiente do ícone (mesma paleta dos chips do menu). */
  gradient: string;
};

/**
 * Barra de navegação inferior — só no celular (< md).
 * Início · principal (OS) · [+ Criar] · Clientes · Menu.
 * Usa a mesma navegação (e as mesmas permissões) do menu lateral.
 */
export function MobileBottomNav({ tenant, permissions, lockedNavIds }: Props) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const [createOpen, setCreateOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const items = useMemo<NavItem[]>(() => {
    const raw = getTenantNav(tenant.slug, tenant.segment, {
      segmentVersion: tenant.segment_version,
      segmentConfig: tenant.segment_config,
      redeOperacional: tenant.rede_operacional,
    });
    const permitted =
      permissions === undefined
        ? raw
        : filterNavByPermissions(raw, permissions);
    return lockedNavIds && lockedNavIds.length > 0
      ? permitted.filter((item) => !lockedNavIds.includes(item.id))
      : permitted;
  }, [
    tenant.slug,
    tenant.segment,
    tenant.segment_version,
    tenant.segment_config,
    tenant.rede_operacional,
    permissions,
    lockedNavIds,
  ]);

  // Some enquanto o teclado está aberto (digitando) para liberar tela.
  useEffect(() => {
    const isField = (el: EventTarget | null) =>
      el instanceof HTMLElement &&
      (el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.tagName === "SELECT" ||
        el.isContentEditable);
    const onIn = (e: FocusEvent) => {
      if (
        isField(e.target) &&
        !(e.target as HTMLInputElement).matches?.(
          "[type=checkbox],[type=radio],[type=button],[type=submit]",
        )
      ) {
        setKeyboardOpen(true);
      }
    };
    const onOut = () => setKeyboardOpen(false);
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
    };
  }, []);

  const byId = (id: string) => items.find((item) => item.id === id);
  const home = byId("dashboard") ?? byId("ops-center");
  const workOrders = byId("work-orders");
  const sales = byId("sales");
  const clients = byId("clients");
  const agenda = byId("agenda");
  const main = workOrders ?? sales;
  const second = clients ?? agenda;

  const quickActions: QuickAction[] = [];
  if (workOrders) {
    const label = shortLabel(workOrders.title);
    quickActions.push({
      key: "nova-os",
      label: label === "OS" ? "Nova OS" : `Novo(a) ${workOrders.title}`,
      hint: "Abrir atendimento",
      href: `${workOrders.href}/nova`,
      icon: Wrench,
      gradient: "linear-gradient(135deg,#34d27a,#12a152)",
    });
  }
  if (sales) {
    quickActions.push({
      key: "nova-venda",
      label: "Nova venda",
      hint: "Pedido ou orçamento",
      href: `${sales.href}/nova`,
      icon: ShoppingCart,
      gradient: "linear-gradient(135deg,#ffb454,#ff8a1f)",
    });
    quickActions.push({
      key: "venda-rapida",
      label: "Venda rápida",
      hint: "Balcão, em segundos",
      href: `${sales.href}/rapida`,
      icon: Zap,
      gradient: "linear-gradient(135deg,#ffe066,#f8c208)",
    });
  }
  if (clients) {
    quickActions.push({
      key: "novo-cliente",
      label: "Novo cliente",
      hint: "Cadastro rápido",
      href: `${clients.href}/novo`,
      icon: UserPlus,
      gradient: "linear-gradient(135deg,#c084fc,#8b5cf6)",
    });
  }
  if (agenda) {
    quickActions.push({
      key: "agendar",
      label: "Agendar",
      hint: "Marcar horário",
      href: agenda.href,
      icon: CalendarPlus,
      gradient: "linear-gradient(135deg,#5ec8ff,#1a86e0)",
    });
  }

  const isActive = (item: NavItem | undefined, exact = false) => {
    if (!item || !pathname) return false;
    if (exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const slot = (
    item: NavItem | undefined,
    Icon: LucideIcon,
    label: string,
    exact = false,
  ) =>
    item ? (
      <Link
        key={item.id}
        href={item.href}
        aria-current={isActive(item, exact) ? "page" : undefined}
        className="mobile-nav-tab"
        data-active={isActive(item, exact) ? "true" : "false"}
      >
        <span className="mobile-nav-icon">
          <Icon className="size-[22px]" aria-hidden />
        </span>
        <span className="mobile-nav-label">{label}</span>
      </Link>
    ) : null;

  return (
    <>
      <nav
        aria-label="Navegação principal"
        data-mobile-bottom-nav=""
        data-hidden={keyboardOpen ? "true" : "false"}
        className={cn(
          "mobile-bottom-nav md:hidden",
          keyboardOpen && "translate-y-full opacity-0",
        )}
      >
        <div className="mobile-bottom-nav-inner">
          {slot(home, LayoutDashboard, "Início", true)}
          {slot(
            main,
            main?.id === "sales" ? ShoppingCart : Wrench,
            main ? shortLabel(main.title) : "",
          )}

          {quickActions.length > 0 ? (
            <button
              type="button"
              className="mobile-nav-create"
              aria-label="Criar novo"
              aria-haspopup="dialog"
              onClick={() => setCreateOpen(true)}
            >
              <span>
                <Plus className="size-7 stroke-[2.6]" aria-hidden />
              </span>
            </button>
          ) : null}

          {slot(second, second?.id === "agenda" ? CalendarPlus : Users, second ? shortLabel(second.title) : "")}

          <button
            type="button"
            className="mobile-nav-tab"
            data-active="false"
            aria-label="Abrir menu"
            onClick={() => setOpenMobile(true)}
          >
            <span className="mobile-nav-icon">
              <Menu className="size-[22px]" aria-hidden />
            </span>
            <span className="mobile-nav-label">Menu</span>
          </button>
        </div>
      </nav>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent
          side="bottom"
          className="mobile-create-sheet rounded-t-[1.5rem] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2"
        >
          <div
            className="mx-auto mt-1 h-1 w-10 rounded-full bg-white/20"
            aria-hidden
          />
          <SheetHeader className="px-1 pb-0 pt-2">
            <SheetTitle className="text-lg font-bold">O que você quer criar?</SheetTitle>
            <SheetDescription>Escolha e já comece.</SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.key}
                href={action.href}
                onClick={() => setCreateOpen(false)}
                className="mobile-create-card"
              >
                <span
                  className="mobile-create-chip"
                  style={{ background: action.gradient }}
                >
                  <action.icon className="size-5" aria-hidden />
                </span>
                <span className="mobile-create-title">{action.label}</span>
                <span className="mobile-create-hint">{action.hint}</span>
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
