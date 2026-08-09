/**
 * Manifesto de Release Candidate — apenas metadados públicos.
 * Não contém tokens, keys ou URLs secretas.
 */
export const MOBILE_RC = {
  sprint: "31.10",
  classification: "RELEASE_CANDIDATE",
  displayName: "Gestão no Foco",
  slug: "gestao-no-foco",
  scheme: "gof",
  bundleIdentifier: "com.gestaonofoco.app",
  androidPackage: "com.gestaonofoco.app",
  version: "1.10.0",
  iosBuildNumber: "110",
  androidVersionCode: 110,
  brand: {
    gold: "#C9A84C",
    navy: "#0B0F14",
    black: "#05070A",
  },
  easProfiles: ["development", "preview", "internal", "production"] as const,
  /** Push nativo ainda não wired — plugin não habilitado no RC. */
  pushNotificationsEnabled: false,
  /** OTA exige EAS_PROJECT_ID no ambiente de build. */
  updatesRequireProjectId: true,
  stores: {
    apkGenerated: false,
    aabGenerated: false,
    ipaGenerated: false,
    published: false,
  },
} as const;
