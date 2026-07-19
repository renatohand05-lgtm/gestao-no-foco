"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { useWorkspace } from "@/components/executive/workspace/workspace-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DsIcon } from "@/components/ui/ds-icon";
import { exAnimations, exTypography } from "@/lib/design-system";
import { listWorkspaceCommands } from "@/lib/workspace";
import { cn } from "@/lib/utils";

/**
 * Command bar estilo Spotlight — arquitetura apenas (Sprint 12.1).
 * Sem backend / sem fetch.
 */
export function ExecutiveCommandBar() {
  const { commandOpen, setCommandOpen } = useWorkspace();
  const [query, setQuery] = useState("");
  const commands = useMemo(() => listWorkspaceCommands(), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCommandOpen]);

  const filtered = commands.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.label.toLowerCase().includes(q) ||
      c.hint.toLowerCase().includes(q) ||
      c.kind.includes(q)
    );
  });

  return (
    <Dialog
      open={commandOpen}
      onOpenChange={(open) => {
        setCommandOpen(open);
        if (!open) setQuery("");
      }}
    >
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border/40 px-4 py-3">
          <DialogTitle className="sr-only">Command Bar</DialogTitle>
          <DialogDescription className="sr-only">
            Busca rápida de indicadores e atalhos do workspace.
          </DialogDescription>
          <div className="flex items-center gap-2">
            <DsIcon icon={Search} size="sm" className="text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar indicadores, centros, ações…"
              className={cn(
                "h-10 w-full bg-transparent text-sm outline-none",
                exAnimations.focusRing,
              )}
              aria-label="Campo de comando"
            />
          </div>
        </DialogHeader>
        <ul className="max-h-72 overflow-y-auto p-2" role="listbox">
          {filtered.map((cmd) => (
            <li key={cmd.id}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                className={cn(
                  "flex w-full flex-col rounded-xl px-3 py-2.5 text-left",
                  exAnimations.hoverLift,
                  exAnimations.focusRing,
                  "hover:bg-muted/50",
                )}
                onClick={() => {
                  // Sem navegação dedicada — fecha o seletor
                  setCommandOpen(false);
                }}
              >
                <span className="text-sm font-medium">{cmd.label}</span>
                <span className={exTypography.caption}>{cmd.hint}</span>
              </button>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className={cn("px-3 py-6 text-center", exTypography.caption)}>
              Nenhum resultado para esta busca.
            </li>
          ) : null}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
