"use client";

import { useCallback, useId, useRef, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
} from "lucide-react";

import { ExecutivePresetSelector } from "@/components/executive/layout/executive-preset-selector";
import { useLayout } from "@/components/executive/layout/layout-context";
import { useLayoutDnd } from "@/components/executive/layout/use-layout-dnd";
import {
  DENSITY_PRIORITY_LABEL,
  LAYOUT_BLOCK_DESCRIPTIONS,
} from "@/components/executive/layout/layout-ui";
import { Button } from "@/components/ui/button";
import { DsIcon } from "@/components/ui/ds-icon";
import {
  LAYOUT_BLOCK_LABELS,
  sortBlocks,
  type LayoutBlockId,
} from "@/lib/dashboard-layout";
import {
  exAnimations,
  exGlass,
  exMotion,
  exRadius,
  exShadow,
  exTypography,
} from "@/lib/design-system";
import { cn } from "@/lib/utils";

/**
 * Workspace Editor — Drag & Drop Premium (Sprint 13.7).
 * Pointer + teclado + touch (long-press) · moveTo local · save na 13.6.
 */
export function ExecutiveLayoutEditor() {
  const {
    state,
    studioView,
    move,
    moveTo,
    toggleVisible,
    cycleDensity,
    duplicate,
    isDirty,
    persistStatus,
  } = useLayout();

  const listId = useId();
  const liveId = useId();
  const listRef = useRef<HTMLDivElement | null>(null);
  const [liveMessage, setLiveMessage] = useState("");

  const blocks = sortBlocks(state.blocks);
  const itemIds = blocks.map((b) => b.id);

  const getLabel = useCallback(
    (id: LayoutBlockId) => LAYOUT_BLOCK_LABELS[id],
    [],
  );

  const onReorder = useCallback(
    (id: LayoutBlockId, toIndex: number) => {
      moveTo(id, toIndex);
      window.requestAnimationFrame(() => {
        const handle = listRef.current?.querySelector<HTMLElement>(
          `[data-dnd-item="${id}"] [aria-label^="Reordenar"]`,
        );
        handle?.focus();
      });
    },
    [moveTo],
  );

  const onAnnounce = useCallback((message: string) => {
    setLiveMessage(message);
  }, []);

  const dnd = useLayoutDnd({
    itemIds,
    listRef,
    getLabel,
    onReorder,
    onAnnounce,
    enabled: state.editMode && studioView === "edit",
  });

  if (!state.editMode || studioView === "preview") return null;

  return (
    <aside
      className={cn(
        exRadius[20],
        exGlass.panel,
        "border-slate-200/50 bg-white/80 p-4 dark:bg-card/90 sm:p-5",
        exAnimations.slide,
      )}
      aria-label="Workspace Editor"
    >
      <div className="mb-4 flex items-start gap-3">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
          <DsIcon icon={Layers} size="sm" className="text-current" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={exTypography.sectionTitle}>Workspace Editor</p>
          <p className={cn(exTypography.caption, "mt-0.5")}>
            Arraste pelo handle · toque longo no mobile · Espaço/Enter no teclado.
            A ordem só é gravada ao Salvar.
          </p>
          <p className={cn(exTypography.caption, "mt-1 text-slate-400")}>
            {persistStatus === "saving"
              ? "Salvando…"
              : isDirty
                ? "Alterações não salvas"
                : persistStatus === "saved" || persistStatus === "synced"
                  ? "Sincronizado"
                  : persistStatus === "error" || persistStatus === "conflict"
                    ? "Erro ao salvar — suas alterações locais foram mantidas"
                    : "Pronto"}
          </p>
        </div>
      </div>

      <ExecutivePresetSelector />

      <div
        id={liveId}
        className="sr-only"
        aria-live="assertive"
        aria-atomic="true"
      >
        {liveMessage}
      </div>

      <div
        ref={listRef}
        className="mt-5 space-y-2"
        role="list"
        aria-label="Módulos do dashboard"
        id={listId}
        aria-describedby={liveId}
      >
        {blocks.map((block, index) => {
          const isActive = dnd.activeId === block.id;
          const isDragging =
            isActive &&
            (dnd.phase === "dragging" || dnd.phase === "keyboard");
          const showLineBefore =
            dnd.insertIndex === index && dnd.phase !== "idle" && dnd.phase !== "pending";

          return (
            <div key={block.id} className="relative">
              {showLineBefore ? <DropLine /> : null}
              <article
                role="listitem"
                data-dnd-item={block.id}
                data-editor-card={block.id}
                data-dnd-phase={isDragging ? dnd.phase : "idle"}
                aria-label={`${LAYOUT_BLOCK_LABELS[block.id]}. ${LAYOUT_BLOCK_DESCRIPTIONS[block.id]}`}
                className={cn(
                  "group border bg-white dark:bg-card",
                  exRadius[16],
                  "p-3.5",
                  exShadow.card,
                  exMotion.transition,
                  block.visible
                    ? "border-slate-200/55"
                    : "border-dashed border-slate-300/70 opacity-70",
                  !isDragging && exMotion.hoverLift,
                  isDragging &&
                    "opacity-35 ring-2 ring-blue-500/35 shadow-lg scale-[0.99]",
                  dnd.settlingId === block.id && exMotion.dropSettle,
                  dnd.phase === "keyboard" &&
                    isActive &&
                    "ring-2 ring-sky-500/40",
                )}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    aria-label={`Reordenar ${LAYOUT_BLOCK_LABELS[block.id]}`}
                    aria-describedby={liveId}
                    aria-grabbed={isDragging || undefined}
                    aria-keyshortcuts="Space Enter ArrowUp ArrowDown Escape"
                    className={cn(
                      "mt-0.5 inline-flex size-11 shrink-0 touch-none items-center justify-center rounded-xl text-slate-400",
                      "bg-slate-50 hover:bg-slate-100 hover:text-slate-600",
                      "dark:bg-white/5 dark:hover:bg-white/10",
                      "cursor-grab active:cursor-grabbing",
                      exAnimations.touchTarget,
                      exAnimations.focusRing,
                      exMotion.ripple,
                      isDragging && "cursor-grabbing bg-blue-50 text-blue-600",
                    )}
                    onPointerDown={(e) =>
                      dnd.onHandlePointerDown(e, block.id, index)
                    }
                    onPointerMove={(e) =>
                      dnd.onHandlePointerMove(e, block.id, index)
                    }
                    onPointerUp={dnd.onHandlePointerUp}
                    onPointerCancel={dnd.onHandlePointerCancel}
                    onKeyDown={(e) => dnd.onHandleKeyDown(e, block.id, index)}
                  >
                    <DsIcon icon={GripVertical} size="sm" />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={exTypography.cardTitle}>
                        {LAYOUT_BLOCK_LABELS[block.id]}
                      </p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5",
                          exTypography.caption,
                          "bg-slate-100 text-slate-500 dark:bg-white/5",
                        )}
                      >
                        {DENSITY_PRIORITY_LABEL[block.density]}
                      </span>
                      {!block.visible ? (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5",
                            exTypography.caption,
                            "bg-amber-50 text-amber-700 dark:bg-amber-500/10",
                          )}
                        >
                          Oculto
                        </span>
                      ) : null}
                    </div>
                    <p className={cn(exTypography.caption, "mt-1")}>
                      {LAYOUT_BLOCK_DESCRIPTIONS[block.id]}
                    </p>

                    <div
                      className="mt-3 flex flex-wrap gap-1.5"
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <ToolBtn
                        label="Mover para cima"
                        onClick={() => move(block.id, "up")}
                      >
                        <DsIcon icon={ArrowUp} size="sm" />
                      </ToolBtn>
                      <ToolBtn
                        label="Mover para baixo"
                        onClick={() => move(block.id, "down")}
                      >
                        <DsIcon icon={ArrowDown} size="sm" />
                      </ToolBtn>
                      <ToolBtn
                        label={block.visible ? "Ocultar" : "Mostrar"}
                        pressed={!block.visible}
                        onClick={() => toggleVisible(block.id)}
                      >
                        <DsIcon
                          icon={block.visible ? Eye : EyeOff}
                          size="sm"
                        />
                        <span className="ml-1 hidden sm:inline">
                          {block.visible ? "Ocultar" : "Mostrar"}
                        </span>
                      </ToolBtn>
                      <ToolBtn
                        label={`Prioridade: ${DENSITY_PRIORITY_LABEL[block.density]}`}
                        onClick={() => cycleDensity(block.id)}
                      >
                        Prioridade
                      </ToolBtn>
                      <ToolBtn
                        label="Duplicar workspace"
                        onClick={() => void duplicate()}
                      >
                        <DsIcon icon={Copy} size="sm" />
                        <span className="ml-1 hidden sm:inline">Duplicar</span>
                      </ToolBtn>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          );
        })}
        {dnd.insertIndex === blocks.length &&
        dnd.phase !== "idle" &&
        dnd.phase !== "pending" ? (
          <DropLine />
        ) : null}
      </div>

      {dnd.ghost && dnd.phase === "dragging" ? (
        <div
          className="pointer-events-none fixed z-[80] -translate-x-1/2 -translate-y-1/2"
          style={{
            left: dnd.ghost.x,
            top: dnd.ghost.y,
            width: Math.min(dnd.ghost.width, 360),
          }}
          aria-hidden
        >
          <div
            className={cn(
              exRadius[16],
              "border border-blue-500/30 bg-white/95 p-3 backdrop-blur-sm dark:bg-card/95",
              exShadow.ghost,
              "rotate-[1.5deg] scale-[1.02] opacity-95",
            )}
          >
            <p className={exTypography.cardTitle}>{dnd.ghost.label}</p>
            <p className={exTypography.caption}>Solte para reposicionar</p>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function DropLine() {
  return (
    <div
      className={cn(
        "relative z-10 mx-1 h-0.5 rounded-full bg-blue-500",
        exShadow.insertLine,
      )}
      aria-hidden
    >
      <span className="absolute -left-1 top-1/2 size-2 -translate-y-1/2 rounded-full bg-blue-500" />
      <span className="absolute -right-1 top-1/2 size-2 -translate-y-1/2 rounded-full bg-blue-500" />
    </div>
  );
}

function ToolBtn({
  children,
  label,
  onClick,
  pressed,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  pressed?: boolean;
}) {
  return (
    <Button
      type="button"
      size="xs"
      variant={pressed ? "secondary" : "outline"}
      className={cn(
        "min-h-11 rounded-lg px-2.5",
        exAnimations.touchTarget,
        exAnimations.focusRing,
        exMotion.ripple,
        exMotion.transition,
      )}
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {children}
    </Button>
  );
}
