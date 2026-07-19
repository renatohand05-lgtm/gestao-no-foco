import type {
  DemoHideFlags,
  DemoPresentationMode,
} from "@/lib/demo/demo-types";

export const DEMO_STORAGE_KEY = "gnf_demo_presentation";
export const DEMO_QUERY_KEY = "demo";

export const DEMO_MODE_LABELS: Record<DemoPresentationMode, string> = {
  normal: "Modo Normal",
  executive: "Modo Executivo",
  commercial: "Modo Comercial",
  fullscreen: "Modo Tela Cheia",
};

export const DEMO_MODE_HINTS: Record<DemoPresentationMode, string> = {
  normal: "Interface completa para operação diária.",
  executive: "Chrome técnico oculto — foco no cockpit.",
  commercial: "Roteiro de apresentação + narrativa limpa.",
  fullscreen: "Tela cheia sem sidebar — ideal para projetor.",
};

export function hideFlagsForMode(mode: DemoPresentationMode): DemoHideFlags {
  if (mode === "normal") {
    return {
      studioToolbar: false,
      studioChrome: false,
      persistStatus: false,
      previewBanner: false,
      commandBarDevCopy: false,
      technicalBadges: false,
      onboardingLead: false,
      footerTechPanel: false,
      layoutEditor: false,
      appSidebar: false,
      appHeaderExtras: false,
      emptyDevHints: false,
    };
  }

  const base: DemoHideFlags = {
    studioToolbar: true,
    studioChrome: true,
    persistStatus: true,
    previewBanner: true,
    commandBarDevCopy: true,
    technicalBadges: true,
    onboardingLead: true,
    footerTechPanel: true,
    layoutEditor: true,
    appSidebar: false,
    appHeaderExtras: true,
    emptyDevHints: true,
  };

  if (mode === "fullscreen") {
    return { ...base, appSidebar: true };
  }

  return base;
}

/** Slug futuro / convenção para dados demo — sem banco paralelo. */
export function isDemoDataTenantSlug(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return slug.startsWith("demo-") || slug === "demo";
}
