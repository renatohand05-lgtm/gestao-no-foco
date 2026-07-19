/**
 * Utilitários de performance / timing — Sprint 13.21.
 * Não altera queries; apenas mede e registra.
 */

import { logger } from "@/lib/observability/logger";

const DEFAULT_SLOW_MS = Number(process.env.SLOW_QUERY_MS || 800);

export async function withTiming<T>(
  label: string,
  fn: () => Promise<T>,
  opts?: { slowMs?: number; context?: Record<string, unknown> },
): Promise<T> {
  const slowMs = opts?.slowMs ?? DEFAULT_SLOW_MS;
  const started = Date.now();
  try {
    return await fn();
  } finally {
    const ms = Date.now() - started;
    if (ms >= slowMs) {
      logger.warn("slow_operation", {
        label,
        ms,
        thresholdMs: slowMs,
        ...opts?.context,
      });
    } else {
      logger.debug("operation_timing", { label, ms, ...opts?.context });
    }
  }
}

export function createRequestTimer(requestId?: string) {
  const started = Date.now();
  return {
    mark(label: string, context?: Record<string, unknown>) {
      const ms = Date.now() - started;
      logger.debug("request_mark", { requestId, label, ms, ...context });
      return ms;
    },
    end(label = "request_done") {
      const ms = Date.now() - started;
      if (ms >= DEFAULT_SLOW_MS) {
        logger.warn("slow_request", { requestId, label, ms });
      } else {
        logger.debug(label, { requestId, ms });
      }
      return ms;
    },
  };
}
