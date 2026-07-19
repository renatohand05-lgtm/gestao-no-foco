/**
 * Demo Mode — tipos (Sprint 13.13).
 * Apenas apresentação · sem motores · sem banco.
 */

export type DemoPresentationMode =
  | "normal"
  | "executive"
  | "commercial"
  | "fullscreen";

export type DemoHideFlags = {
  studioToolbar: boolean;
  studioChrome: boolean;
  persistStatus: boolean;
  previewBanner: boolean;
  commandBarDevCopy: boolean;
  technicalBadges: boolean;
  onboardingLead: boolean;
  footerTechPanel: boolean;
  layoutEditor: boolean;
  appSidebar: boolean;
  appHeaderExtras: boolean;
  emptyDevHints: boolean;
};

export type DemoModeState = {
  mode: DemoPresentationMode;
  /** true quando mode !== "normal" */
  active: boolean;
  hide: DemoHideFlags;
  /** Ambiente/tenant marcado como demo (futuro). */
  demoDataTenant: boolean;
};
