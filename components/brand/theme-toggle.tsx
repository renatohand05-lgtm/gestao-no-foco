"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/brand/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/**
 * Toggle de tema — ícone estável no SSR/primeira pintura (Sprint 25.7.2).
 * A preferência persistida só altera o ícone após preferenceReady.
 */
export function ThemeToggle({ className }: Props) {
  const { preference, cycle, darkModeEnabled, preferenceReady } = useTheme();

  if (!darkModeEnabled) return null;

  // Antes do mount: usa ícone do default (dark → Moon) para bater com o HTML do servidor.
  const effective = preferenceReady ? preference : "dark";
  const Icon =
    effective === "dark" ? Moon : effective === "light" ? Sun : Monitor;
  const label =
    effective === "dark"
      ? "Tema escuro"
      : effective === "light"
        ? "Tema claro"
        : "Tema do sistema";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "size-9 text-muted-foreground hover:text-[var(--brand-gold)]",
        className,
      )}
      onClick={cycle}
      aria-label={`Alternar tema (atual: ${label})`}
      title={label}
      data-theme-toggle=""
      data-theme-ready={preferenceReady ? "1" : "0"}
    >
      <Icon className="size-4" aria-hidden />
    </Button>
  );
}
