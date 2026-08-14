"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  HelpCircle,
  MoreHorizontal,
  Search,
  Settings,
  Zap,
} from "lucide-react";

import { BrandMark } from "@/components/brand";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    role?: string;
  };
};

/**
 * Header premium — busca, ações, Mais (baixa prioridade), tema, avatar.
 * Notebook: sem colisão — ajuda/config em "Mais" abaixo de xl.
 */
export function AppHeader({ tenantName, tenantSlug, user }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const slug =
    tenantSlug ?? pathname?.split("/").filter(Boolean)[0] ?? undefined;

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 min-w-0 shrink-0 items-center gap-2 overflow-x-hidden px-3 sm:px-4",
        "border-b border-border/50 bg-background/80 backdrop-blur-xl",
        "supports-[backdrop-filter]:bg-background/70",
      )}
      data-app-header-premium=""
      data-premium-v257="header"
    >
      <SidebarTrigger className="-ml-1 text-muted-foreground hover:text-[var(--brand-gold)]" />
      <Separator orientation="vertical" className="mr-1 hidden h-4 sm:block" />

      <div className="flex min-w-0 items-center gap-2.5">
        <BrandMark size="sm" className="hidden sm:inline-flex" />
        <div className="hidden min-w-0 md:block">
          <p className="truncate font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight">
            {brandConfig.name}
            {tenantName ? (
              <span className="font-normal text-muted-foreground">
                {" "}
                · {tenantName}
              </span>
            ) : null}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {user?.role ? `${user.role} · ` : ""}
            {brandConfig.subtitle}
          </p>
        </div>
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-0.5 sm:gap-1">
        {slug ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="hidden h-9 max-w-[12rem] gap-1.5 border-border/50 bg-muted/30 lg:inline-flex"
            onClick={() => router.push(`/${slug}/busca`)}
            aria-label="Busca global"
          >
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-muted-foreground">Buscar…</span>
            <kbd className="ml-1 hidden rounded border border-border/60 px-1.5 text-[10px] text-muted-foreground xl:inline">
              ⌘K
            </kbd>
          </Button>
        ) : null}

        {slug ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 text-muted-foreground hover:text-[var(--brand-gold)] lg:hidden"
            aria-label="Busca"
            onClick={() => router.push(`/${slug}/busca`)}
          >
            <Search className="size-4" />
          </Button>
        ) : null}

        {slug ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 text-muted-foreground hover:text-[var(--brand-gold)]"
            aria-label="Atalhos"
            onClick={() => router.push(`/${slug}/centro-operacoes`)}
          >
            <Zap className="size-4" />
          </Button>
        ) : null}

        {slug ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden size-9 shrink-0 text-muted-foreground hover:text-[var(--brand-gold)] xl:inline-flex"
            aria-label="Ajuda"
            onClick={() => router.push(`/${slug}/configuracoes`)}
          >
            <HelpCircle className="size-4" />
          </Button>
        ) : null}

        {slug ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden size-9 shrink-0 text-muted-foreground hover:text-[var(--brand-gold)] xl:inline-flex"
            aria-label="Configurações"
            onClick={() => router.push(`/${slug}/configuracoes`)}
          >
            <Settings className="size-4" />
          </Button>
        ) : null}

        {slug ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 shrink-0 text-muted-foreground hover:text-[var(--brand-gold)] xl:hidden"
                  aria-label="Mais ações"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuItem
                onClick={() => router.push(`/${slug}/configuracoes`)}
              >
                <HelpCircle className="size-4" />
                Ajuda
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(`/${slug}/configuracoes`)}
              >
                <Settings className="size-4" />
                Configurações
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        <ThemeToggle />

        <UserNav
          email={user?.email}
          name={user?.name}
          avatarUrl={user?.avatarUrl}
        />
      </div>
    </header>
  );
}
