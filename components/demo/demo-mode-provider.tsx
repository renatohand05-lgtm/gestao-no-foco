"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  DEMO_MODE_HINTS,
  DEMO_MODE_LABELS,
  DEMO_QUERY_KEY,
  DEMO_STORAGE_KEY,
  hideFlagsForMode,
  isDemoDataTenantSlug,
  parseDemoMode,
  readDemoModeFromSearch,
  writeDemoModeToStorage,
  type DemoHideFlags,
  type DemoPresentationMode,
} from "@/lib/demo";

type DemoContextValue = {
  mode: DemoPresentationMode;
  active: boolean;
  hide: DemoHideFlags;
  demoDataTenant: boolean;
  labels: typeof DEMO_MODE_LABELS;
  hints: typeof DEMO_MODE_HINTS;
  setMode: (mode: DemoPresentationMode) => void;
  exitDemo: () => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

function subscribeStorage(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const handler = (e: StorageEvent) => {
    if (e.key === DEMO_STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function getStorageSnapshot(): DemoPresentationMode {
  if (typeof window === "undefined") return "normal";
  try {
    return parseDemoMode(window.localStorage.getItem(DEMO_STORAGE_KEY)) ?? "normal";
  } catch {
    return "normal";
  }
}

function getServerSnapshot(): DemoPresentationMode {
  return "normal";
}

type Props = {
  children: ReactNode;
  tenantSlug: string;
};

/**
 * Provider de apresentação. Sem fetch, sem polling, sem engines.
 */
export function DemoModeProvider({ children, tenantSlug }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const stored = useSyncExternalStore(
    subscribeStorage,
    getStorageSnapshot,
    getServerSnapshot,
  );

  const fromQuery = readDemoModeFromSearch(searchParams);
  const mode: DemoPresentationMode = fromQuery ?? stored;
  const hide = hideFlagsForMode(mode);
  const active = mode !== "normal";
  const demoDataTenant = isDemoDataTenantSlug(tenantSlug);

  const setMode = useCallback(
    (next: DemoPresentationMode) => {
      writeDemoModeToStorage(next);
      // Dispara listeners same-tab
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: DEMO_STORAGE_KEY,
            newValue: next,
          }),
        );
      }

      const params = new URLSearchParams(searchParams.toString());
      if (next === "normal") {
        params.delete(DEMO_QUERY_KEY);
      } else {
        params.set(DEMO_QUERY_KEY, next);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const exitDemo = useCallback(() => setMode("normal"), [setMode]);

  const value = useMemo<DemoContextValue>(
    () => ({
      mode,
      active,
      hide,
      demoDataTenant,
      labels: DEMO_MODE_LABELS,
      hints: DEMO_MODE_HINTS,
      setMode,
      exitDemo,
    }),
    [active, demoDataTenant, exitDemo, hide, mode, setMode],
  );

  return (
    <DemoContext.Provider value={value}>
      <div
        data-demo-mode={mode}
        data-demo-active={active ? "true" : "false"}
        className="contents"
      >
        {children}
      </div>
    </DemoContext.Provider>
  );
}

export function useDemoMode(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) {
    return {
      mode: "normal",
      active: false,
      hide: hideFlagsForMode("normal"),
      demoDataTenant: false,
      labels: DEMO_MODE_LABELS,
      hints: DEMO_MODE_HINTS,
      setMode: () => undefined,
      exitDemo: () => undefined,
    };
  }
  return ctx;
}
