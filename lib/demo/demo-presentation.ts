import type { DemoPresentationMode } from "@/lib/demo/demo-types";
import { DEMO_QUERY_KEY, DEMO_STORAGE_KEY } from "@/lib/demo/demo-constants";

const MODES: DemoPresentationMode[] = [
  "normal",
  "executive",
  "commercial",
  "fullscreen",
];

export function parseDemoMode(
  value: string | null | undefined,
): DemoPresentationMode | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "on") return "executive";
  if (v === "0" || v === "false" || v === "off") return "normal";
  if ((MODES as string[]).includes(v)) {
    return v as DemoPresentationMode;
  }
  return null;
}

export function readDemoModeFromStorage(): DemoPresentationMode {
  if (typeof window === "undefined") return "normal";
  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
    return parseDemoMode(raw) ?? "normal";
  } catch {
    return "normal";
  }
}

export function writeDemoModeToStorage(mode: DemoPresentationMode) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEMO_STORAGE_KEY, mode);
  } catch {
    /* ignore quota / private mode */
  }
}

export function readDemoModeFromSearch(
  search: string | URLSearchParams,
): DemoPresentationMode | null {
  const params =
    typeof search === "string"
      ? new URLSearchParams(
          search.startsWith("?") ? search.slice(1) : search,
        )
      : search;
  return parseDemoMode(params.get(DEMO_QUERY_KEY));
}

/**
 * Roteiro de apresentação comercial (mesmas rotas do produto).
 */
export function getDemoPresentationTrail(tenantSlug: string): {
  id: string;
  label: string;
  href: string;
}[] {
  const base = `/${tenantSlug}`;
  return [
    { id: "dashboard", label: "Dashboard", href: `${base}/dashboard` },
    { id: "financeiro", label: "Financeiro", href: `${base}/financeiro` },
    { id: "relatorios", label: "Relatórios", href: `${base}/relatorios` },
    { id: "clientes", label: "Clientes", href: `${base}/clientes` },
    { id: "produtos", label: "Produtos", href: `${base}/produtos` },
    { id: "dashboard-return", label: "Dashboard", href: `${base}/dashboard` },
  ];
}
