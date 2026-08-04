"use client";

import { useRef, useState } from "react";
import { LogOut, Settings, User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/client";

type UserNavProps = {
  email?: string;
  name?: string;
  avatarUrl?: string;
};

/**
 * Logout idempotente — evita refresh RSC na rota protegida após signOut
 * (re-render sem sessão derrubava o error boundary). Navegação hard para /login.
 */
export function UserNav({ email, name, avatarUrl }: UserNavProps) {
  const [signingOut, setSigningOut] = useState(false);
  const inFlight = useRef(false);

  const initials = name
    ? name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  async function handleSignOut() {
    if (inFlight.current || signingOut) return;
    inFlight.current = true;
    setSigningOut(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) {
        console.error(getAuthErrorMessage(error));
      }
    } catch (err) {
      console.error(
        err instanceof Error ? err.message : "Falha ao encerrar sessão",
      );
    } finally {
      // Hard navigation: limpa estado cliente e impede voltar a páginas autenticadas
      // com dados em memória. Idempotente mesmo se signOut falhar parcialmente.
      window.location.assign("/login");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={signingOut}
        render={
          <Button
            variant="ghost"
            className="relative size-8 rounded-full"
            aria-label={signingOut ? "Saindo…" : "Abrir menu do usuário"}
          />
        }
      >
        <Avatar className="size-8">
          <AvatarImage src={avatarUrl} alt={name ?? "Usuário"} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {name ?? "Usuário"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {email ?? "conta@exemplo.com"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled>
            <User className="mr-2 size-4" />
            Perfil
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Settings className="mr-2 size-4" />
            Preferências
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={signingOut}
          onClick={() => {
            void handleSignOut();
          }}
          className="cursor-pointer"
          variant="destructive"
        >
          <LogOut className="mr-2 size-4" />
          {signingOut ? "Saindo…" : "Sair"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
