"use client";

import { Bell, Search } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { UserNav } from "@/components/layout/user-nav";

type AppHeaderProps = {
  tenantName?: string;
  user?: {
    email?: string;
    name?: string;
    avatarUrl?: string;
  };
};

export function AppHeader({ tenantName, user }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 hidden h-4 sm:block" />

      {tenantName ? (
        <div className="hidden min-w-0 sm:block">
          <p className="truncate text-sm font-medium">{tenantName}</p>
          <p className="text-xs text-muted-foreground">Painel de gestão</p>
        </div>
      ) : null}

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar..."
            className="h-9 w-56 border-border/60 bg-muted/30 pl-8 lg:w-64"
          />
        </div>
        <Button variant="ghost" size="icon" className="relative size-9">
          <Bell className="size-4" />
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" />
        </Button>
        <UserNav
          email={user?.email}
          name={user?.name}
          avatarUrl={user?.avatarUrl}
        />
      </div>
    </header>
  );
}
