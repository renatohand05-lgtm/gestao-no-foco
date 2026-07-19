/**
 * Cache in-memory por tenant para dados mestres de baixa volatilidade.
 * Isolado por tenantId. Invalidação explícita após mutações.
 * Não substitui revalidatePath do Next — complementa listagens frequentes no mesmo request tree / processo.
 */

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const STORE = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 60_000;

function key(tenantId: string, bucket: string) {
  return `${tenantId}::${bucket}`;
}

export function masterCacheGet<T>(
  tenantId: string,
  bucket: string,
): T | null {
  const entry = STORE.get(key(tenantId, bucket));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    STORE.delete(key(tenantId, bucket));
    return null;
  }
  return entry.value as T;
}

export function masterCacheSet<T>(
  tenantId: string,
  bucket: string,
  value: T,
  ttlMs = DEFAULT_TTL_MS,
): void {
  STORE.set(key(tenantId, bucket), {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export function masterCacheInvalidate(
  tenantId: string,
  bucket?: string,
): void {
  if (!bucket) {
    for (const k of STORE.keys()) {
      if (k.startsWith(`${tenantId}::`)) STORE.delete(k);
    }
    return;
  }
  STORE.delete(key(tenantId, bucket));
}

export const MASTER_CACHE_BUCKETS = {
  categorias: "categorias_ativas",
  planos: "planos_ativos",
  centros: "centros_ativos",
  formas: "formas_ativas",
  fornecedores: "fornecedores_ativos",
  produtos: "produtos_ativos",
} as const;
