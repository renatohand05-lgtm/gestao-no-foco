/**
 * Logger centralizado — Sprint 13.21.
 * Estruturado, sem PII/secrets. Pronto para hook futuro (Sentry etc.).
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

type LogEntry = {
  level: LogLevel;
  message: string;
  at: string;
  context?: LogContext;
};

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

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

/** Remove chaves sensíveis de contextos de log. */
export function sanitizeContext(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;
  const blocked = /password|secret|token|authorization|service_role|cookie|apikey/i;
  const out: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (blocked.test(key)) {
      out[key] = "[redacted]";
      continue;
    }
    if (typeof value === "string" && value.length > 500) {
      out[key] = `${value.slice(0, 500)}…`;
      continue;
    }
    out[key] = value;
  }
  return out;
}

function emit(level: LogLevel, message: string, context?: LogContext) {
  if (!shouldLog(level)) return;
  const entry: LogEntry = {
    level,
    message,
    at: new Date().toISOString(),
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
