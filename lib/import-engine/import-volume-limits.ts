/**
 * Sprint 25.4.3 — Limites de volume e lotes de processamento.
 */

function readIntEnv(
  env: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
): number {
  const raw = env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

export type ImportVolumeLimits = {
  maxRows: number;
  maxColumns: number;
  batchSize: number;
  concurrency: number;
  timeoutMs: number;
  maxMemoryHintMb: number;
};

export function getImportVolumeLimits(
  env: NodeJS.ProcessEnv = process.env,
): ImportVolumeLimits {
  return {
    maxRows: readIntEnv(env, "IMPORT_MAX_ROWS", 10_000),
    maxColumns: readIntEnv(env, "IMPORT_MAX_COLUMNS", 80),
    batchSize: readIntEnv(env, "IMPORT_BATCH_SIZE", 200),
    concurrency: readIntEnv(env, "IMPORT_CONCURRENCY", 2),
    timeoutMs: readIntEnv(env, "IMPORT_TIMEOUT_MS", 120_000),
    maxMemoryHintMb: readIntEnv(env, "IMPORT_MAX_MEMORY_MB", 256),
  };
}

export function assertWithinVolumeLimits(input: {
  rowCount: number;
  columnCount: number;
  limits?: ImportVolumeLimits;
}): void {
  const limits = input.limits ?? getImportVolumeLimits();
  if (input.rowCount > limits.maxRows) {
    throw new Error(
      `Arquivo com ${input.rowCount} linhas excede o máximo de ${limits.maxRows}.`,
    );
  }
  if (input.columnCount > limits.maxColumns) {
    throw new Error(
      `Arquivo com ${input.columnCount} colunas excede o máximo de ${limits.maxColumns}.`,
    );
  }
}

export function* chunkRows<T>(rows: T[], batchSize: number): Generator<T[]> {
  const size = Math.max(1, batchSize);
  for (let i = 0; i < rows.length; i += size) {
    yield rows.slice(i, i + size);
  }
}

export type BatchProgress = {
  processed: number;
  total: number;
  batchIndex: number;
  cancelled: boolean;
};

export function createCancellableBatchRunner() {
  let cancelled = false;
  return {
    cancel() {
      cancelled = true;
    },
    get cancelled() {
      return cancelled;
    },
    async runBatches<T>(
      rows: T[],
      batchSize: number,
      onBatch: (
        batch: T[],
        progress: BatchProgress,
      ) => Promise<void> | void,
    ): Promise<{ processed: number; cancelled: boolean }> {
      let processed = 0;
      let batchIndex = 0;
      for (const batch of chunkRows(rows, batchSize)) {
        if (cancelled) {
          return { processed, cancelled: true };
        }
        await onBatch(batch, {
          processed,
          total: rows.length,
          batchIndex,
          cancelled,
        });
        processed += batch.length;
        batchIndex += 1;
      }
      return { processed, cancelled: false };
    },
  };
}
