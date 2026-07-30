"use client";

/**
 * Sprint 25.5 / 25.7.2 — Preferência de tema (dark principal / light / system).
 * Preferência persistida via useSyncExternalStore (SSR-safe, sem setState em effect).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { brandStorageKeys } from "@/config/brand";
import {
  GOF_DARK_MODE_ENABLED,
  GOF_THEME_DEFAULT,
  GOF_THEME_HTML_ATTR,
  type GofThemeMode,
} from "@/lib/design-system/theme";

export type ThemePreference = GofThemeMode | "system";

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: GofThemeMode;
  setPreference: (next: ThemePreference) => void;
  cycle: () => void;
  darkModeEnabled: boolean;
  /** true após o store do cliente estar ativo (pós-hidratação) */
  preferenceReady: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return GOF_THEME_DEFAULT;
  try {
    const raw = window.localStorage.getItem(brandStorageKeys.theme);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    /* ignore */
  }
  return GOF_THEME_DEFAULT;
}

function applyDomTheme(mode: GofThemeMode) {
  const root = document.documentElement;
  root.setAttribute(GOF_THEME_HTML_ATTR, mode);
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode;
}

function subscribeSystem(cb: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getSystemSnapshot() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getServerSystemSnapshot(): GofThemeMode {
  return "dark";
}

/** Store de preferência — notifica mesma aba + storage cross-tab. */
let preferenceCache: ThemePreference | null = null;
const preferenceListeners = new Set<() => void>();

function subscribePreference(cb: () => void) {
  preferenceListeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === brandStorageKeys.theme || e.key === null) {
      preferenceCache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    preferenceListeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function getPreferenceSnapshot(): ThemePreference {
  if (preferenceCache == null) preferenceCache = readStoredPreference();
  return preferenceCache;
}

function getServerPreferenceSnapshot(): ThemePreference {
  return GOF_THEME_DEFAULT;
}

function writePreference(next: ThemePreference) {
  preferenceCache = next;
  try {
    window.localStorage.setItem(brandStorageKeys.theme, next);
  } catch {
    /* ignore */
  }
  preferenceListeners.forEach((l) => l());
}

function subscribeClientReady() {
  // Snapshot cliente vs servidor diverge só após hidratação; sem listeners.
  return () => {};
}

function getClientReadySnapshot() {
  return true;
}

function getServerReadySnapshot() {
  return false;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = useSyncExternalStore(
    subscribePreference,
    getPreferenceSnapshot,
    getServerPreferenceSnapshot,
  );

  const preferenceReady = useSyncExternalStore(
    subscribeClientReady,
    getClientReadySnapshot,
    getServerReadySnapshot,
  );

  const systemMode = useSyncExternalStore(
    subscribeSystem,
    getSystemSnapshot,
    getServerSystemSnapshot,
  );

  const resolved: GofThemeMode = !GOF_DARK_MODE_ENABLED
    ? "light"
    : preference === "system"
      ? systemMode
      : preference;

  useEffect(() => {
    applyDomTheme(resolved);
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    writePreference(next);
  }, []);

  const cycle = useCallback(() => {
    const order: ThemePreference[] = GOF_DARK_MODE_ENABLED
      ? ["dark", "light", "system"]
      : ["light"];
    const idx = order.indexOf(preference);
    writePreference(order[(idx + 1) % order.length]!);
  }, [preference]);

  const value = useMemo(
    () => ({
      preference,
      resolved,
      setPreference,
      cycle,
      darkModeEnabled: GOF_DARK_MODE_ENABLED,
      preferenceReady,
    }),
    [preference, resolved, setPreference, cycle, preferenceReady],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme deve ser usado dentro de ThemeProvider.");
  }
  return ctx;
}
