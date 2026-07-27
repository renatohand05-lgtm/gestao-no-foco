/**
 * Sprint 21.5 — Renderer seguro de templates (sem eval).
 */

import { NotificationTemplateError } from "./notification-errors.ts";
import type { NotificationTemplate } from "./types.ts";

const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;

export type RenderOptions = {
  /** Se true, erro quando variável ausente sem fallback. */
  strict?: boolean;
};

export function renderTemplateString(
  template: string,
  variables: Record<string, unknown>,
  fallbacks: Record<string, string> = {},
  options: RenderOptions = {},
): string {
  const strict = options.strict !== false;

  return template.replace(PLACEHOLDER, (_match, key: string) => {
    const raw = variables[key];
    if (raw !== undefined && raw !== null && String(raw).length > 0) {
      return String(raw);
    }
    if (key in fallbacks) {
      return fallbacks[key];
    }
    if (strict) {
      throw new NotificationTemplateError(
        `Variável ausente no template: ${key}`,
      );
    }
    return "";
  });
}

export function renderNotificationTemplate(
  template: NotificationTemplate,
  variables: Record<string, unknown>,
  options?: RenderOptions,
): { title: string; message: string } {
  const fallbacks = template.fallbacks ?? {};
  return {
    title: renderTemplateString(
      template.titleTemplate,
      variables,
      fallbacks,
      options,
    ),
    message: renderTemplateString(
      template.messageTemplate,
      variables,
      fallbacks,
      options,
    ),
  };
}
