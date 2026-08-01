/**
 * Fase 27 — Privacidade / redaction antes de qualquer provider.
 */

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,3}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}/g;
const CPF_RE = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const CNPJ_RE = /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
const TOKEN_RE =
  /\b(sk-[a-zA-Z0-9]{10,}|Bearer\s+[A-Za-z0-9._\-]+|api[_-]?key\s*[:=]\s*\S+)/gi;

const SECRET_KEYS = new Set([
  "password",
  "senha",
  "token",
  "secret",
  "apiKey",
  "api_key",
  "accessToken",
  "refreshToken",
  "authorization",
  "creditCard",
  "cartao",
  "cvv",
]);

export type RedactionResult = {
  text: string;
  redactedCount: number;
  categories: string[];
};

export function redactSensitiveText(input: string): RedactionResult {
  let text = String(input ?? "");
  const categories = new Set<string>();
  let redactedCount = 0;

  const apply = (re: RegExp, label: string, replacement: string) => {
    const next = text.replace(re, () => {
      redactedCount += 1;
      categories.add(label);
      return replacement;
    });
    text = next;
  };

  apply(TOKEN_RE, "secret", "[REDACTED_SECRET]");
  apply(EMAIL_RE, "email", "[REDACTED_EMAIL]");
  apply(CPF_RE, "document", "[REDACTED_CPF]");
  apply(CNPJ_RE, "document", "[REDACTED_CNPJ]");
  apply(PHONE_RE, "phone", "[REDACTED_PHONE]");

  return { text, redactedCount, categories: [...categories] };
}

export function stripSecretsFromObject<T extends Record<string, unknown>>(
  obj: T,
): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SECRET_KEYS.has(k) || SECRET_KEYS.has(k.toLowerCase())) {
      out[k] = "[REDACTED]";
      continue;
    }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = stripSecretsFromObject(v as Record<string, unknown>);
    } else if (typeof v === "string") {
      out[k] = redactSensitiveText(v).text;
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

export function assertNoCrossTenantPayload(
  payloadTenantId: string,
  requestTenantId: string,
): void {
  if (payloadTenantId !== requestTenantId) {
    throw new Error("TENANT_ISOLATION_VIOLATION");
  }
}
