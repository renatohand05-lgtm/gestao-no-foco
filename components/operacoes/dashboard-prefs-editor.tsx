"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { FeedbackMessage } from "@/components/ui/feedback-message";
import { buttonVariants } from "@/components/ui/button";
import {
  restoreDashboardPrefsAction,
  saveDashboardPrefsAction,
} from "@/lib/operacoes/dashboard-prefs-actions";
import type { DashboardPreferencia } from "@/lib/operacoes/dashboard-prefs-service";
import { cn } from "@/lib/utils";

type CardOption = { key: string; label: string };

type Props = {
  tenantSlug: string;
  dashboardTipo: string;
  allCards: CardOption[];
  initial: DashboardPreferencia;
  canPersonalizar: boolean;
};

export function DashboardPrefsEditor({
  tenantSlug,
  dashboardTipo,
  allCards,
  initial,
  canPersonalizar,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [modo, setModo] = useState(initial.modo);
  const [fullscreen, setFullscreen] = useState(initial.fullscreenDefault);
  const [open, setOpen] = useState(false);

  const initialOrder = useMemo(() => {
    const order = (initial.layout.order as string[] | undefined) ?? [];
    if (order.length) return order;
    return allCards.map((c) => c.key);
  }, [initial.layout.order, allCards]);

  const [order, setOrder] = useState<string[]>(initialOrder);
  const [visible, setVisible] = useState<Set<string>>(() => {
    if (initial.cardsVisiveis.length) return new Set(initial.cardsVisiveis);
    return new Set(allCards.map((c) => c.key));
  });

  if (!canPersonalizar) return null;

  function move(key: string, dir: -1 | 1) {
    setOrder((prev) => {
      const i = prev.indexOf(key);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function toggle(key: string) {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const r = await saveDashboardPrefsAction(tenantSlug, {
        dashboardTipo,
        modo,
        cardsVisiveis: [...visible],
        order,
        fullscreenDefault: fullscreen,
      });
      if (!r.success) setError(r.error ?? "Falha");
      else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  function restore() {
    startTransition(async () => {
      const r = await restoreDashboardPrefsAction(tenantSlug, dashboardTipo);
      if (!r.success) setError(r.error ?? "Falha");
      else router.refresh();
    });
  }

  function enterFullscreen() {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      void el.requestFullscreen?.();
    } else {
      void document.exitFullscreen?.();
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          onClick={() => setOpen((v) => !v)}
        >
          Personalizar
        </button>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          onClick={enterFullscreen}
        >
          Tela cheia
        </button>
      </div>

      {open ? (
        <div className="rounded-lg border bg-card p-4 space-y-3 text-sm">
          {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
          <div className="flex flex-wrap gap-3">
            <label className="space-y-1">
              <span className="text-muted-foreground">Modo</span>
              <select
                className="flex h-9 rounded-md border border-input bg-transparent px-2"
                value={modo}
                onChange={(e) =>
                  setModo(e.target.value as typeof modo)
                }
              >
                <option value="normal">Normal</option>
                <option value="executivo">Executivo</option>
                <option value="comercial">Comercial</option>
              </select>
            </label>
            <label className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                checked={fullscreen}
                onChange={(e) => setFullscreen(e.target.checked)}
              />
              Preferir tela cheia
            </label>
          </div>

          <p className="text-xs text-muted-foreground">
            Marque os cards e use as setas para ordem. Salve para persistir.
          </p>
          <ul className="space-y-1 max-h-64 overflow-y-auto">
            {order.map((key) => {
              const card = allCards.find((c) => c.key === key);
              if (!card) return null;
              return (
                <li
                  key={key}
                  className="flex items-center gap-2 rounded border px-2 py-1.5"
                >
                  <input
                    type="checkbox"
                    checked={visible.has(key)}
                    onChange={() => toggle(key)}
                  />
                  <span className="flex-1">{card.label}</span>
                  <button
                    type="button"
                    className="text-xs underline"
                    onClick={() => move(key, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="text-xs underline"
                    onClick={() => move(key, 1)}
                  >
                    ↓
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              className={cn(buttonVariants({ size: "sm" }))}
              onClick={save}
            >
              Salvar layout
            </button>
            <button
              type="button"
              disabled={pending}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              onClick={restore}
            >
              Restaurar padrão
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
