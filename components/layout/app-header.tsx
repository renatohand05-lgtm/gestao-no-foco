"use client";

import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { BrandMark } from "@/components/brand";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UserNav } from "@/components/layout/user-nav";
import { brandConfig } from "@/config/brand";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  tenantName?: string;
  tenantSlug?: string;
  user?: {
    email?: string;
    name?: string;
    avatarUrl?: string;
  };
};

/**
 * Header — Brand + tenant + busca + usuário (Gate 19.4).
 * Sem sino/avatar duplicados do TopBar do Dashboard.
 */
export function AppHeader({ tenantName, tenantSlug, user }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const slug =
    tenantSlug ??
    pathname?.split("/").filter(Boolean)[0] ??
    undefined;
  const isDashboard = Boolean(slug && pathname?.includes(`/${slug}/dashboard`));

  return (
    <header className="sticky top-0 z-30 flex h-14 min-w-0 shrink-0 items-center gap-2 overflow-x-hidden border-b border-border/60 bg-[var(--brand-white)]/90 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--brand-white)]/75">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 hidden h-4 sm:block" />

      <div className="flex min-w-0 items-center gap-2.5">
        <BrandMark size="sm" className="hidden sm:inline-flex" />
        <div className="hidden min-w-0 sm:block">
          <p className="truncate font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight text-[var(--brand-graphite)]">
            {brandConfig.name}
            {tenantName ? (
              <span className="font-normal text-muted-foreground">
                {" "}
                · {tenantName}
              </span>
            ) : null}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {brandConfig.subtitle}
          </p>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {!isDashboard && slug ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "hidden h-9 gap-1.5 border-border/60 bg-muted/40 md:inline-flex",
            )}
            onClick={() => router.push(`/${slug}/clientes`)}
            aria-label="Buscar clientes"
          >
            <Search className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">Buscar…</span>
          </Button>
        ) : null}
        <UserNav
          email={user?.email}
          name={user?.name}
          avatarUrl={user?.avatarUrl}
        />
      </div>
    </header>
  );
}
