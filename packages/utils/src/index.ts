/**
 * @gof/utils — helpers multiplataforma (stub 31.0).
 */

const SENSITIVE_KEYS =
  /token|password|passwd|secret|authorization|api[_-]?key|refresh|anon|bearer|cpf|cnpj|documento|document|email|phone|telefone|senha/i;

export function sanitizeForLog(value: unknown): unknown {
  if (value == null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sanitizeForLog);
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEYS.test(key) ? "[REDACTED]" : sanitizeForLog(val);
  }
  return out;
}

export function createRequestId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `req_${ts}_${rand}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
