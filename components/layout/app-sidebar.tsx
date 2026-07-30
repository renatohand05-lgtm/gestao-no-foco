"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import { BrandLogo, BrandMark } from "@/components/brand";
import { getTenantNav, type NavItem } from "@/config/navigation";
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
  useSidebar,
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
  const gestao = [
    ...byHref("/financeiro"),
    ...byHref("/integracoes"),
    ...byHref("/relatorios"),
  ];
  const sistema = byHref("/configuracoes");

  return [
    { label: "Principal", items: [...centro, ...dashboard, ...busca] },
    { label: "Operação", items: operacao },
    { label: "Gestão", items: gestao },
    { label: "Sistema", items: sistema },
  ].filter((g) => g.items.length > 0);
}

/**
 * Sidebar — identidade oficial Gestão (Gate 19.0.1).
 * Só apresentação / branding.
 */
export function AppSidebar({ tenant, tenants }: AppSidebarProps) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const groups = groupNav(getTenantNav(tenant.slug));

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-[var(--brand-gray-light)] bg-[var(--brand-gray-light)] dark:border-white/10 dark:bg-sidebar"
    >
      <SidebarHeader className="gap-3 px-3 py-5">
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
              {collapsed ? (
                <BrandMark size="md" />
              ) : (
                <BrandLogo markSize="md" showEdition className="min-w-0" />
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!collapsed ? (
          <p className="truncate px-3 text-[11px] text-muted-foreground">
            {tenant.name}
          </p>
        ) : null}
      </SidebarHeader>

      <SidebarSeparator className="mx-3 bg-[var(--brand-gray-dark)]/15 dark:bg-white/10" />

      <SidebarContent className="gap-6 px-2 py-4">
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="gap-1.5 p-0">
            <SidebarGroupLabel className="px-3 font-[family-name:var(--font-display)] text-[10px] font-medium tracking-[0.14em] text-[var(--brand-gray-dark)]/70 uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {groups.length > 0 &&
                  group.items.map((item) => {
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
                            "text-[var(--brand-gray-dark)] hover:bg-white hover:text-[var(--brand-graphite)]",
                            "dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white",
                            "data-[active=true]:bg-white data-[active=true]:text-[var(--brand-graphite)] data-[active=true]:shadow-sm",
                            "data-[active=true]:ring-1 data-[active=true]:ring-[var(--brand-gold)]/25",
                            "dark:data-[active=true]:bg-white/10 dark:data-[active=true]:text-white",
                            "focus-visible:ring-2 focus-visible:ring-[var(--brand-gold)]/40",
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

      <SidebarFooter className="gap-2 px-3 py-4">
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
        active
          ? "text-[var(--brand-gold)]"
          : "text-[var(--brand-gray-dark)]/70",
      )}
      aria-hidden
    />
  );
}
