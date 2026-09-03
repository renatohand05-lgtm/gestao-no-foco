"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";

import { BrandLogo, BrandMark } from "@/components/brand";
import { useTheme } from "@/components/brand/theme-provider";
import { getTenantNav } from "@/config/navigation";
import { filterNavByPermissions } from "@/lib/navigation/filter-nav-by-permissions";
import {
  buildSidebarNavGroups,
  isNavItemActive,
  sidebarItemKey,
} from "@/lib/navigation/sidebar-nav";
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
  /** Permissões efetivas (UX). Backend/RLS continuam autoridade. */
  permissions?: readonly string[];
  /** true se o usuário é dono da plataforma ou associado com indicações. */
  isPlatformPartner?: boolean;
  /** IDs de item de menu escondidos — modo "simular plano" (só dono). */
  lockedNavIds?: readonly string[];
};

/**
 * Sidebar — identidade oficial Gestão (Gate 19.0.1 + Sprint 25.7.2 keys).
 * Só apresentação / branding — agrupamento via id/group estáveis.
 */
export function AppSidebar({
  tenant,
  tenants,
  permissions,
  isPlatformPartner,
  lockedNavIds,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { state } = useSidebar();
  const { resolved } = useTheme();
  const collapsed = state === "collapsed";
  const dark = resolved === "dark";

  const groups = useMemo(() => {
    const raw = getTenantNav(tenant.slug, tenant.segment, {
      segmentVersion: tenant.segment_version,
      segmentConfig: tenant.segment_config,
    });
    const permitted =
      permissions === undefined
        ? raw
        : filterNavByPermissions(raw, permissions);
    const items =
      lockedNavIds && lockedNavIds.length > 0
        ? permitted.filter((item) => !lockedNavIds.includes(item.id))
        : permitted;
    return buildSidebarNavGroups(items);
  }, [
    tenant.slug,
    tenant.segment,
    tenant.segment_version,
    tenant.segment_config,
    permissions,
    lockedNavIds,
  ]);

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar"
      data-app-sidebar-premium=""
      data-premium-v257="sidebar"
      data-sidebar-nav-keys="id"
    >
      <SidebarHeader className="gap-3 px-3 py-5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className={cn(
                "rounded-xl transition-colors duration-150",
                "hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent",
              )}
              render={<Link href={`/${tenant.slug}/dashboard`} />}
            >
              {collapsed ? (
                <BrandMark size="md" variant={dark ? "dark" : "light"} />
              ) : (
                <BrandLogo
                  markSize="lg"
                  showEdition
                  inverse={dark}
                  officialWordmark
                  className="min-w-0 max-w-[220px]"
                />
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!collapsed ? (
          <p className="truncate px-3 text-[11px] text-muted-foreground">
            {tenant.name}
          </p>
        ) : null}
        {isPlatformPartner ? (
          <Link
            href="/master/dashboard"
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium text-[var(--brand-gold)] transition-colors hover:bg-sidebar-accent",
              collapsed && "justify-center px-0",
            )}
            title="Voltar para Visão do Dono"
          >
            <ArrowLeft className="size-3.5 shrink-0" />
            {!collapsed ? <span>Visão do Dono</span> : null}
          </Link>
        ) : null}
      </SidebarHeader>

      <SidebarSeparator className="mx-3 bg-sidebar-border" />

      <SidebarContent className="gap-6 px-2 py-4">
        {groups.map((group) => (
          <SidebarGroup key={group.id} className="gap-1.5 p-0">
            <SidebarGroupLabel className="px-3 font-[family-name:var(--font-display)] text-[10px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => {
                  const active = isNavItemActive(
                    pathname,
                    item,
                    group.items,
                  );
                  return (
                    <SidebarMenuItem key={sidebarItemKey(group.id, item)}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={active}
                        tooltip={item.title}
                        className={cn(
                          "h-9 rounded-lg px-3 text-[13px] font-medium transition-all duration-150",
                          "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          "data-[active=true]:bg-[var(--brand-gold)]/12 data-[active=true]:text-[var(--brand-gold-soft)]",
                          "data-[active=true]:shadow-[inset_3px_0_0_0_var(--brand-gold)]",
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
        active ? "text-[var(--brand-gold)]" : "text-muted-foreground",
      )}
      aria-hidden
    />
  );
}
