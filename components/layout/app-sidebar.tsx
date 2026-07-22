"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import { getTenantNav, type NavItem } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { TenantSwitcher } from "@/components/layout/tenant-switcher";
import { cn } from "@/lib/utils";
import type { TenantWithRole } from "@/types";

type AppSidebarProps = {
  tenant: TenantWithRole;
  tenants: TenantWithRole[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

function groupNav(items: NavItem[]): NavGroup[] {
  const byHref = (match: string) =>
    items.filter((item) => item.href.includes(match));

  const centro = items.filter((i) => i.href.endsWith("/centro-operacoes"));
  const dashboard = items.filter((i) => i.href.endsWith("/dashboard"));
  const busca = items.filter((i) => i.href.endsWith("/busca"));
  const operacao = [
    ...byHref("/clientes"),
    ...byHref("/produtos"),
    ...byHref("/estoque"),
    ...byHref("/vendas"),
    ...byHref("/ordens"),
  ];
  const gestao = [...byHref("/financeiro"), ...byHref("/relatorios")];
  const sistema = byHref("/configuracoes");

  return [
    { label: "Principal", items: [...centro, ...dashboard, ...busca] },
    { label: "Operação", items: operacao },
    { label: "Gestão", items: gestao },
    { label: "Sistema", items: sistema },
  ].filter((g) => g.items.length > 0);
}

/**
 * Sidebar premium estilo Linear (Sprint 13.1) — só apresentação.
 */
export function AppSidebar({ tenant, tenants }: AppSidebarProps) {
  const pathname = usePathname();
  const groups = groupNav(getTenantNav(tenant.slug));

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-slate-200/50 bg-[#f4f4f5] dark:border-white/10 dark:bg-sidebar"
    >
      <SidebarHeader className="gap-3 px-3 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className={cn(
                "rounded-xl transition-colors duration-150",
                "hover:bg-white data-[active=true]:bg-white",
                "dark:hover:bg-white/5",
              )}
              render={<Link href={`/${tenant.slug}/dashboard`} />}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900">
                <span className="text-[11px] font-bold tracking-tight">GF</span>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold tracking-tight">
                  {siteConfig.name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {tenant.name}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator className="mx-3 bg-slate-200/70 dark:bg-white/10" />

      <SidebarContent className="gap-5 px-2 py-3">
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="gap-1 p-0">
            <SidebarGroupLabel className="px-3 text-[10px] font-medium tracking-[0.12em] text-slate-400 uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname?.startsWith(`${item.href}/`) === true;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={active}
                        tooltip={item.title}
                        className={cn(
                          "h-9 rounded-lg px-3 text-[13px] font-medium transition-all duration-150",
                          "text-slate-600 hover:bg-white hover:text-slate-900",
                          "dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white",
                          "data-[active=true]:bg-white data-[active=true]:text-slate-950 data-[active=true]:shadow-[0_1px_2px_rgba(15,23,42,0.06)]",
                          "dark:data-[active=true]:bg-white/10 dark:data-[active=true]:text-white",
                          "focus-visible:ring-2 focus-visible:ring-blue-600/30",
                        )}
                      >
                        <NavIcon icon={item.icon} active={active} />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="gap-2 px-3 py-3">
        <TenantSwitcher currentTenant={tenant} tenants={tenants} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

function NavIcon({
  icon: Icon,
  active,
}: {
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Icon
      className={cn(
        "size-4 stroke-[1.75] transition-colors duration-150",
        active ? "text-slate-900 dark:text-white" : "text-slate-400",
      )}
      aria-hidden
    />
  );
}
