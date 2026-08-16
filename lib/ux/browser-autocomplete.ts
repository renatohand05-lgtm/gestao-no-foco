/**
 * Sprint 35.2.1 hotfix — isola campos operacionais do histórico do browser.
 * As sugestões oficiais vêm da biblioteca de segmento, não do Chrome.
 */
export const OPERATIONAL_AUTOCOMPLETE_PROPS = {
  autoComplete: "off",
  autoCorrect: "off",
  autoCapitalize: "off",
  spellCheck: false,
  "data-1p-ignore": true,
  "data-lpignore": "true",
} as const;
