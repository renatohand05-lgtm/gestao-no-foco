"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Check, ChevronsUpDown, Loader2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { TenantRole } from "@/lib/constants";
import type { TenantWithRole } from "@/types";

type TenantSwitcherProps = {
  currentTenant: TenantWithRole;
  tenants: TenantWithRole[];
};

const ROLE_LABELS: Record<TenantRole, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  manager: "Gestor",
  member: "Membro",
};

function roleLabel(role: string | null | undefined) {
  if (!role) return "—";
  return ROLE_LABELS[role as TenantRole] ?? role;
}

/**
 * Seletor de empresas — troca via router.push (não clona Next Link no Menu.Item).
 * Base UI + Next 16 em produção pode derrubar o error boundary ao clonar Link lazy.
 *
 * Criação de empresa adicional (multi-tenant): fluxo completo ainda não
 * existe para quem já tem membership — onboarding só atende 1ª empresa.
 * Ver desenho em docs/testing/evidence/hotfix-tenant-logout/.
 */
export function TenantSwitcher({
  currentTenant,
  tenants,
}: TenantSwitcherProps) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const safeTenants = useMemo(() => {
    const list = Array.isArray(tenants) ? tenants : [];
    return list.filter(
      (t): t is TenantWithRole =>
        Boolean(t?.id && t?.slug && typeof t.slug === "string" && t.slug.length > 0),
    );
  }, [tenants]);

  const switching = isPending || pendingSlug != null;

  function switchTenant(slug: string) {
    if (!slug || switching) return;
    if (slug === currentTenant.slug) return;

    setError(null);
    setPendingSlug(slug);
    startTransition(() => {
      try {
        router.push(`/${slug}/dashboard`);
      } catch {
        setPendingSlug(null);
        setError("Não foi possível trocar de empresa. Tente novamente.");
      }
    });
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={switching}
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                aria-label={`Empresa atual: ${currentTenant.name}. Abrir seletor de empresas`}
              />
            }
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              {switching ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Building2 className="size-4" aria-hidden />
              )}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{currentTenant.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {roleLabel(currentTenant.role)}
              </span>
            </div>
            <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-70" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg w-(--anchor-width)"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Empresas
            </DropdownMenuLabel>
            {safeTenants.length === 0 ? (
              <div className="px-2 py-3 text-sm text-muted-foreground" role="status">
                Nenhuma empresa vinculada a esta conta.
              </div>
            ) : (
              safeTenants.map((tenant) => {
                const active = tenant.id === currentTenant.id;
                const busy = pendingSlug === tenant.slug;
                return (
                  <DropdownMenuItem
                    key={tenant.id}
                    disabled={switching}
                    onClick={() => switchTenant(tenant.slug)}
                    className="cursor-pointer gap-2"
                    aria-current={active ? "true" : undefined}
                  >
                    <Building2 className="size-4 shrink-0" aria-hidden />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{tenant.name}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {roleLabel(tenant.role)}
                      </span>
                    </span>
                    {busy ? (
                      <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                    ) : active ? (
                      <Check className="size-4 shrink-0 text-[var(--brand-gold)]" aria-hidden />
                    ) : null}
                  </DropdownMenuItem>
                );
              })
            )}
            {error ? (
              <>
                <DropdownMenuSeparator />
                <p className="px-2 py-2 text-xs text-destructive" role="alert">
                  {error}
                </p>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
