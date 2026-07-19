"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

import {
  computeInsertIndex,
  insertIndexToMoveTarget,
  LAYOUT_DND_EDGE_SCROLL_PX,
  LAYOUT_DND_LONG_PRESS_MS,
  LAYOUT_DND_SCROLL_SPEED,
  shouldStartDrag,
} from "@/lib/dashboard-layout/layout-dnd";
import type { LayoutBlockId } from "@/lib/dashboard-layout";

export type LayoutDndPhase =
  | "idle"
  | "pending"
  | "dragging"
  | "keyboard"
  | "settling";

export type LayoutDndGhost = {
  id: LayoutBlockId;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
};

type Options = {
  itemIds: LayoutBlockId[];
  listRef: RefObject<HTMLElement | null>;
  getLabel: (id: LayoutBlockId) => string;
  onReorder: (id: LayoutBlockId, toIndex: number) => void;
  onAnnounce: (message: string) => void;
  enabled?: boolean;
};

/**
 * Drag & Drop premium — Pointer Events + teclado (Sprint 13.7).
 * Não persiste; apenas reordena via callback (moveTo).
 * phaseRef evita estado stale durante pointercapture.
 */
export function useLayoutDnd({
  itemIds,
  listRef,
  getLabel,
  onReorder,
  onAnnounce,
  enabled = true,
}: Options) {
  const [phase, setPhase] = useState<LayoutDndPhase>("idle");
  const [activeId, setActiveId] = useState<LayoutBlockId | null>(null);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [ghost, setGhost] = useState<LayoutDndGhost | null>(null);
  const [settlingId, setSettlingId] = useState<LayoutBlockId | null>(null);

  const phaseRef = useRef<LayoutDndPhase>("idle");
  const fromIndexRef = useRef<number | null>(null);
  const insertRef = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressDoneRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);
  const lastClientYRef = useRef(0);
  const activeIdRef = useRef<LayoutBlockId | null>(null);
  const keyboardInsertRef = useRef<number | null>(null);
  const itemIdsRef = useRef(itemIds);
  const updateInsertFromYRef = useRef<(clientY: number) => void>(() => {});

  const setPhaseBoth = useCallback((next: LayoutDndPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (scrollRafRef.current !== null) {
      window.cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
  }, []);

  const readItemRects = useCallback(() => {
    const root = listRef.current;
    if (!root) return [] as Array<{ top: number; height: number }>;
    const nodes = root.querySelectorAll<HTMLElement>("[data-dnd-item]");
    return Array.from(nodes).map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, height: r.height };
    });
  }, [listRef]);

  const updateInsertFromY = useCallback(
    (clientY: number) => {
      const { insertIndex: next } = computeInsertIndex(clientY, readItemRects());
      insertRef.current = next;
      setInsertIndex(next);
    },
    [readItemRects],
  );

  useEffect(() => {
    itemIdsRef.current = itemIds;
  }, [itemIds]);

  useEffect(() => {
    updateInsertFromYRef.current = updateInsertFromY;
  }, [updateInsertFromY]);

  const startAutoScroll = useCallback(() => {
    stopAutoScroll();
    const tick = () => {
      const y = lastClientYRef.current;
      const vh = window.innerHeight;
      let dy = 0;
      if (y < LAYOUT_DND_EDGE_SCROLL_PX) {
        dy = -LAYOUT_DND_SCROLL_SPEED;
      } else if (y > vh - LAYOUT_DND_EDGE_SCROLL_PX) {
        dy = LAYOUT_DND_SCROLL_SPEED;
      }
      if (dy !== 0) {
        window.scrollBy({ top: dy, behavior: "instant" as ScrollBehavior });
        updateInsertFromYRef.current(y);
      }
      scrollRafRef.current = window.requestAnimationFrame(tick);
    };
    scrollRafRef.current = window.requestAnimationFrame(tick);
  }, [stopAutoScroll]);

  const beginDrag = useCallback(
    (
      id: LayoutBlockId,
      index: number,
      clientX: number,
      clientY: number,
      width: number,
      height: number,
    ) => {
      activeIdRef.current = id;
      fromIndexRef.current = index;
      setActiveId(id);
      setPhaseBoth("dragging");
      setGhost({
        id,
        x: clientX,
        y: clientY,
        width,
        height,
        label: getLabel(id),
      });
      updateInsertFromY(clientY);
      onAnnounce(
        `${getLabel(id)} capturado. Mova para reposicionar. Escape cancela.`,
      );
      startAutoScroll();
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate?.(8);
        } catch {
          /* opcional */
        }
      }
    },
    [getLabel, onAnnounce, setPhaseBoth, startAutoScroll, updateInsertFromY],
  );

  const cancelDrag = useCallback(
    (announce = true) => {
      clearLongPress();
      stopAutoScroll();
      pointerIdRef.current = null;
      startPointRef.current = null;
      longPressDoneRef.current = false;
      fromIndexRef.current = null;
      insertRef.current = null;
      activeIdRef.current = null;
      keyboardInsertRef.current = null;
      setActiveId(null);
      setInsertIndex(null);
      setGhost(null);
      setPhaseBoth("idle");
      if (announce) onAnnounce("Reordenação cancelada.");
    },
    [clearLongPress, onAnnounce, setPhaseBoth, stopAutoScroll],
  );

  const commitDrag = useCallback(() => {
    const id = activeIdRef.current;
    const from = fromIndexRef.current;
    const insert = insertRef.current;
    const len = itemIdsRef.current.length;
    clearLongPress();
    stopAutoScroll();
    pointerIdRef.current = null;
    startPointRef.current = null;
    longPressDoneRef.current = false;

    if (id !== null && from !== null && insert !== null) {
      const target = insertIndexToMoveTarget(from, insert, len);
      if (target !== from) {
        onReorder(id, target);
        setSettlingId(id);
        window.setTimeout(() => setSettlingId(null), 200);
        onAnnounce(
          `${getLabel(id)} movido para a posição ${target + 1} de ${len}.`,
        );
      } else {
        onAnnounce("Posição inalterada.");
      }
    }

    activeIdRef.current = null;
    fromIndexRef.current = null;
    insertRef.current = null;
    keyboardInsertRef.current = null;
    setActiveId(null);
    setInsertIndex(null);
    setGhost(null);
    setPhaseBoth("idle");
  }, [
    clearLongPress,
    getLabel,
    onAnnounce,
    onReorder,
    setPhaseBoth,
    stopAutoScroll,
  ]);

  const onHandlePointerDown = useCallback(
    (
      e: ReactPointerEvent<HTMLButtonElement>,
      id: LayoutBlockId,
      index: number,
    ) => {
      if (!enabled) return;
      if (e.button !== 0) return;
      if (phaseRef.current === "keyboard") return;
      e.preventDefault();
      e.stopPropagation();

      const handle = e.currentTarget;
      const card = handle.closest<HTMLElement>("[data-dnd-item]");
      const rect = (card ?? handle).getBoundingClientRect();

      pointerIdRef.current = e.pointerId;
      startPointRef.current = { x: e.clientX, y: e.clientY };
      longPressDoneRef.current = false;
      lastClientYRef.current = e.clientY;
      setPhaseBoth("pending");
      setActiveId(id);
      fromIndexRef.current = index;
      activeIdRef.current = id;

      try {
        handle.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      clearLongPress();
      if (e.pointerType === "touch" || e.pointerType === "pen") {
        longPressTimerRef.current = window.setTimeout(() => {
          longPressDoneRef.current = true;
          beginDrag(id, index, e.clientX, e.clientY, rect.width, rect.height);
        }, LAYOUT_DND_LONG_PRESS_MS);
      }
    },
    [beginDrag, clearLongPress, enabled, setPhaseBoth],
  );

  const onHandlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>, id: LayoutBlockId, index: number) => {
      if (!enabled) return;
      if (pointerIdRef.current !== e.pointerId) return;
      const start = startPointRef.current;
      if (!start) return;

      lastClientYRef.current = e.clientY;
      const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y);
      const current = phaseRef.current;

      if (current === "pending") {
        if (
          (e.pointerType === "touch" || e.pointerType === "pen") &&
          moved > 10 &&
          !longPressDoneRef.current
        ) {
          cancelDrag(false);
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {
            /* ignore */
          }
          return;
        }

        const card = e.currentTarget.closest<HTMLElement>("[data-dnd-item]");
        const rect = (card ?? e.currentTarget).getBoundingClientRect();
        if (
          shouldStartDrag(
            e.pointerType,
            moved,
            longPressDoneRef.current,
          )
        ) {
          clearLongPress();
          beginDrag(id, index, e.clientX, e.clientY, rect.width, rect.height);
        }
        return;
      }

      if (current !== "dragging") return;
      e.preventDefault();
      setGhost((g) =>
        g
          ? {
              ...g,
              x: e.clientX,
              y: e.clientY,
            }
          : g,
      );
      updateInsertFromY(e.clientY);
    },
    [beginDrag, cancelDrag, clearLongPress, enabled, updateInsertFromY],
  );

  const onHandlePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (pointerIdRef.current !== e.pointerId) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      if (phaseRef.current === "dragging") {
        commitDrag();
        return;
      }
      cancelDrag(false);
    },
    [cancelDrag, commitDrag],
  );

  const onHandleKeyDown = useCallback(
    (
      e: React.KeyboardEvent<HTMLButtonElement>,
      id: LayoutBlockId,
      index: number,
    ) => {
      if (!enabled) return;
      const current = phaseRef.current;
      const len = itemIdsRef.current.length;

      if (current === "idle" || current === "settling") {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          activeIdRef.current = id;
          fromIndexRef.current = index;
          keyboardInsertRef.current = index;
          insertRef.current = index;
          setActiveId(id);
          setInsertIndex(index);
          setPhaseBoth("keyboard");
          onAnnounce(
            `${getLabel(id)} selecionado. Use setas para mover, Enter para confirmar, Escape para cancelar.`,
          );
        }
        return;
      }

      if (current !== "keyboard" || activeIdRef.current !== id) return;

      if (e.key === "Escape") {
        e.preventDefault();
        cancelDrag();
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        const next = Math.max(0, (keyboardInsertRef.current ?? index) - 1);
        keyboardInsertRef.current = next;
        insertRef.current = next;
        setInsertIndex(next);
        onAnnounce(`Posição ${next + 1}`);
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(len, (keyboardInsertRef.current ?? index) + 1);
        keyboardInsertRef.current = next;
        insertRef.current = next;
        setInsertIndex(next);
        onAnnounce(`Posição ${Math.min(next + 1, len)}`);
        return;
      }

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        commitDrag();
      }
    },
    [cancelDrag, commitDrag, enabled, getLabel, onAnnounce, setPhaseBoth],
  );

  useEffect(() => {
    if (phase !== "dragging" && phase !== "keyboard") return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        cancelDrag();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancelDrag, phase]);

  useEffect(
    () => () => {
      clearLongPress();
      stopAutoScroll();
    },
    [clearLongPress, stopAutoScroll],
  );

  return {
    phase,
    activeId,
    insertIndex,
    ghost,
    settlingId,
    onHandlePointerDown,
    onHandlePointerMove,
    onHandlePointerUp,
    onHandlePointerCancel: onHandlePointerUp,
    onHandleKeyDown,
    cancelDrag,
  };
}
