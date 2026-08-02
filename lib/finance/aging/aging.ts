/**
 * Fase 28.6 — Aging de inadimplência (puro).
 * Buckets: a_vencer | 0_30 | 31_60 | 61_90 | 90_mais
 */

export type AgingBucketKey =
  | "a_vencer"
  | "0_30"
  | "31_60"
  | "61_90"
  | "90_mais";

export type AgingTitulo = {
  id: string;
  clienteId?: string | null;
  clienteNome?: string | null;
  valor: number;
  dataVencimento: string; // YYYY-MM-DD
  status?: string | null;
};

export type AgingBucket = {
  key: AgingBucketKey;
  label: string;
  quantidade: number;
  valor: number;
  titulos: AgingTitulo[];
};

export const AGING_BUCKET_LABELS: Record<AgingBucketKey, string> = {
  a_vencer: "A vencer",
  "0_30": "0–30 dias",
  "31_60": "31–60 dias",
  "61_90": "61–90 dias",
  "90_mais": "90+ dias",
};

function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T12:00:00`);
  const b = Date.parse(`${toIso}T12:00:00`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.floor((b - a) / 86_400_000);
}

export function classifyAgingBucket(
  dataVencimento: string,
  hojeIso: string,
): AgingBucketKey {
  const dias = daysBetween(dataVencimento, hojeIso);
  if (dias < 0) return "a_vencer";
  if (dias <= 30) return "0_30";
  if (dias <= 60) return "31_60";
  if (dias <= 90) return "61_90";
  return "90_mais";
}

export function buildAgingReport(
  titulos: AgingTitulo[],
  hojeIso: string,
): {
  buckets: AgingBucket[];
  totalVencido: number;
  totalAVencer: number;
  totalGeral: number;
} {
  const map = new Map<AgingBucketKey, AgingBucket>();
  for (const key of Object.keys(AGING_BUCKET_LABELS) as AgingBucketKey[]) {
    map.set(key, {
      key,
      label: AGING_BUCKET_LABELS[key],
      quantidade: 0,
      valor: 0,
      titulos: [],
    });
  }

  for (const t of titulos) {
    const valor = Number(t.valor);
    if (!Number.isFinite(valor) || valor <= 0) continue;
    const key = classifyAgingBucket(t.dataVencimento, hojeIso);
    const bucket = map.get(key)!;
    bucket.quantidade += 1;
    bucket.valor += valor;
    bucket.titulos.push(t);
  }

  const buckets = [...map.values()];
  const totalAVencer = buckets.find((b) => b.key === "a_vencer")?.valor ?? 0;
  const totalVencido = buckets
    .filter((b) => b.key !== "a_vencer")
    .reduce((s, b) => s + b.valor, 0);

  return {
    buckets,
    totalVencido,
    totalAVencer,
    totalGeral: totalVencido + totalAVencer,
  };
}
