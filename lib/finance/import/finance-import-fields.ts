/**
 * Sprint 22.5.1 — Campos-alvo agora vivem em
 * `lib/import-engine/adapters/finance/fields.ts` (fonte única — engine
 * consolidada). Este arquivo reexporta para não quebrar imports existentes.
 */
// Import relativo (não "@/…") de propósito: este arquivo é carregado
// diretamente por scripts Node (--experimental-strip-types) que não
// resolvem o alias de path do Next.js.
export {
  FINANCE_IMPORT_MODULE,
  FINANCE_IMPORT_ENTITY,
  FINANCE_MOVEMENT_IMPORT_FIELDS,
} from "../../import-engine/adapters/finance/fields.ts";

export function resolveMovementKind(
  amount: number,
  kindRaw: unknown,
): "entrada" | "saida" {
  const k = String(kindRaw ?? "")
    .trim()
    .toLowerCase();
  if (
    ["entrada", "credito", "crédito", "credit", "c", "receita"].includes(k)
  ) {
    return "entrada";
  }
  if (
    ["saida", "saída", "debito", "débito", "debit", "d", "despesa"].includes(k)
  ) {
    return "saida";
  }
  // Sem tipo: valor negativo ⇒ saída
  return amount < 0 ? "saida" : "saida";
}
