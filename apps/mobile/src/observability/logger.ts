import { sanitizeForLog } from "@gof/utils";

type LogLevel = "debug" | "info" | "warn" | "error";

function emit(level: LogLevel, event: string, payload?: unknown) {
  if (!__DEV__ && level === "debug") return;
  const safe = payload === undefined ? undefined : sanitizeForLog(payload);
  const line = `[gof.mobile] ${event}`;
  switch (level) {
    case "debug":
      console.debug(line, safe);
      break;
    case "info":
      console.info(line, safe);
      break;
    case "warn":
      console.warn(line, safe);
      break;
    case "error":
      console.error(line, safe);
      break;
  }
}

export const logger = {
  debug: (event: string, payload?: unknown) => emit("debug", event, payload),
  info: (event: string, payload?: unknown) => emit("info", event, payload),
  warn: (event: string, payload?: unknown) => emit("warn", event, payload),
  error: (event: string, payload?: unknown) => emit("error", event, payload),
};
