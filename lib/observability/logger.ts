/**
 * Logger centralizado — Sprint 13.21 / reforço 34.6.
 * Estruturado, sem PII/secrets. Pronto para hook futuro (Sentry etc.).
 * Não criar conta Sentry automaticamente nesta sprint.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

type LogEntry = {
  level: LogLevel;
  message: string;
  at: string;
  env?: string;
  context?: LogContext;
};

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SENSITIVE_KEY =
  /password|passwd|secret|token|authorization|service_role|cookie|apikey|api[_-]?key|access[_-]?token|refresh[_-]?token|bearer|pan|cvv|ccv|credit[_-]?card|card[_-]?number|asaas[_-]?api|webhook[_-]?secret|private[_-]?key|session/i;

function minLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL || "").toLowerCase();
  if (raw === "debug" || raw === "info" || raw === "warn" || raw === "error") {
    return raw;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(level: LogLevel) {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minLevel()];
}

function runtimeEnvLabel(): string {
  return process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
}

function looksLikeSecretValue(value: string): boolean {
  if (/^Bearer\s+/i.test(value)) return true;
  if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(value)) return true; // JWT-ish
  if (/sk_(live|test)_/i.test(value)) return true;
  if (/service_role/i.test(value) && value.length > 40) return true;
  return false;
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (value == null) return value;
  if (typeof value === "string") {
    if (looksLikeSecretValue(value)) return "[redacted]";
    if (value.length > 500) return `${value.slice(0, 500)}…`;
    return value;
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1));
  }
  const out: LogContext = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY.test(key)) {
      out[key] = "[redacted]";
      continue;
    }
    out[key] = sanitizeValue(nested, depth + 1);
  }
  return out;
}

/** Remove chaves/valores sensíveis de contextos de log (recursivo). */
export function sanitizeContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;
  return sanitizeValue(context) as LogContext;
}

function emit(level: LogLevel, message: string, context?: LogContext) {
  if (!shouldLog(level)) return;
  const entry: LogEntry = {
    level,
    message,
    at: new Date().toISOString(),
    env: runtimeEnvLabel(),
    context: sanitizeContext(context),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug(message: string, context?: LogContext) {
    emit("debug", message, context);
  },
  info(message: string, context?: LogContext) {
    emit("info", message, context);
  },
  warn(message: string, context?: LogContext) {
    emit("warn", message, context);
  },
  error(message: string, context?: LogContext) {
    emit("error", message, context);
  },
  /** Erro com objeto Error — stack só em non-production ou se DEBUG_STACK=1 */
  exception(message: string, error: unknown, context?: LogContext) {
    const err =
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            ...(process.env.NODE_ENV !== "production" ||
            process.env.DEBUG_STACK === "1"
              ? { stack: error.stack }
              : {}),
          }
        : { detail: error };
    emit("error", message, { ...context, error: err });
  },
};
