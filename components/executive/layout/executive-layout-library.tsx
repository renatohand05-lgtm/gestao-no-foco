"use client";

import { useState } from "react";
import { Star, Trash2 } from "lucide-react";

import { useLayout } from "@/components/executive/layout/layout-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DsIcon } from "@/components/ui/ds-icon";
import { exAnimations, exTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Biblioteca de layouts persistidos do usuário (Sprint 13.6).
 */
export function ExecutiveLayoutLibrary({ open, onOpenChange }: Props) {
  const {
    layoutSummaries,
    activeLayoutId,
    selectPersistedLayout,
    setDefaultPersistedLayout,
    deletePersistedLayout,
    renamePersistedLayout,
    refreshLayoutList,
  } = useLayout();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) void refreshLayoutList();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Meus layouts</DialogTitle>
          <DialogDescription>
            Layouts salvos neste tenant para o seu usuário. Isolados por empresa.
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-[22rem] space-y-2 overflow-y-auto">
          {layoutSummaries.length === 0 ? (
            <li className={cn(exTypography.caption, "py-6 text-center")}>
              Nenhum layout salvo ainda. Use Salvar no editor.
            </li>
          ) : (
            layoutSummaries.map((item) => {
              const active = item.id === activeLayoutId;
              return (
                <li
                  key={item.id}
                  className={cn(
                    "rounded-xl border border-slate-200/60 bg-white p-3 dark:border-white/10 dark:bg-card",
                    active && "ring-2 ring-blue-600/20",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {renamingId === item.id ? (
                        <input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className={cn(
                            "h-9 w-full rounded-lg border border-border/60 px-2 text-sm",
                            exAnimations.focusRing,
                          )}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              void renamePersistedLayout(
                                item.id,
                                renameValue,
                              ).then(() => setRenamingId(null));
                            }
                          }}
                        />
                      ) : (
                        <p className={exTypography.cardTitle}>{item.name}</p>
                      )}
                      <p className={cn(exTypography.caption, "mt-1")}>
                        {item.is_default ? "Padrão · " : null}
                        Atualizado{" "}
                        {new Date(item.updated_at).toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    {active ? (
                      <span className={cn(exTypography.caption, "text-blue-600")}>
                        Ativo
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      size="xs"
                      variant="outline"
                      onClick={() => void selectPersistedLayout(item.id)}
                    >
                      Abrir
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      onClick={() => {
                        setRenamingId(item.id);
                        setRenameValue(item.name);
                      }}
                    >
                      Renomear
                    </Button>
                    {renamingId === item.id ? (
                      <Button
                        type="button"
                        size="xs"
                        onClick={() =>
                          void renamePersistedLayout(item.id, renameValue).then(
                            () => setRenamingId(null),
                          )
                        }
                      >
                        Confirmar
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      onClick={() => void setDefaultPersistedLayout(item.id)}
                    >
                      <DsIcon icon={Star} size="sm" className="mr-1" />
                      Padrão
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      className="text-rose-600"
                      onClick={() => void deletePersistedLayout(item.id)}
                    >
                      <DsIcon icon={Trash2} size="sm" className="mr-1" />
                      Excluir
                    </Button>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
