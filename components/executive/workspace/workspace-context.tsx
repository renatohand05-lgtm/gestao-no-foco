"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  nextCardDensity,
  toggleFavoriteList,
} from "@/lib/workspace";
import type {
  WorkspaceBlockId,
  WorkspaceCardDensity,
} from "@/lib/workspace";

type WorkspaceContextValue = {
  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
  toggleFocusMode: () => void;
  favorites: WorkspaceBlockId[];
  toggleFavorite: (id: WorkspaceBlockId) => void;
  isFavorite: (id: WorkspaceBlockId) => boolean;
  densities: Partial<Record<WorkspaceBlockId, WorkspaceCardDensity>>;
  cycleDensity: (id: WorkspaceBlockId) => void;
  getDensity: (id: WorkspaceBlockId) => WorkspaceCardDensity;
  commandOpen: boolean;
  setCommandOpen: (v: boolean) => void;
  loadedAt: number | null;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [focusMode, setFocusMode] = useState(false);
  const [favorites, setFavorites] = useState<WorkspaceBlockId[]>([]);
  const [densities, setDensities] = useState<
    Partial<Record<WorkspaceBlockId, WorkspaceCardDensity>>
  >({});
  const [commandOpen, setCommandOpen] = useState(false);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setLoadedAt(performance.now());
    });
  }, []);

  const toggleFocusMode = useCallback(() => {
    setFocusMode((v) => !v);
  }, []);

  const toggleFavorite = useCallback((id: WorkspaceBlockId) => {
    setFavorites((prev) => toggleFavoriteList(prev, id));
  }, []);

  const isFavorite = useCallback(
    (id: WorkspaceBlockId) => favorites.includes(id),
    [favorites],
  );

  const cycleDensity = useCallback((id: WorkspaceBlockId) => {
    setDensities((prev) => ({
      ...prev,
      [id]: nextCardDensity(prev[id] ?? "normal"),
    }));
  }, []);

  const getDensity = useCallback(
    (id: WorkspaceBlockId): WorkspaceCardDensity =>
      densities[id] ?? "normal",
    [densities],
  );

  const value = useMemo(
    () => ({
      focusMode,
      setFocusMode,
      toggleFocusMode,
      favorites,
      toggleFavorite,
      isFavorite,
      densities,
      cycleDensity,
      getDensity,
      commandOpen,
      setCommandOpen,
      loadedAt,
    }),
    [
      focusMode,
      toggleFocusMode,
      favorites,
      toggleFavorite,
      isFavorite,
      densities,
      cycleDensity,
      getDensity,
      commandOpen,
      loadedAt,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return ctx;
}
