/**
 * Campos extras da agenda 35.2 / hotfix 35.2.x.
 * Colunas podem estar só em `recorrencia_json.meta35_2` até a migration aplicar.
 */
import type { AgendaEventRow } from "@/lib/agenda/agenda-service";
import type { AgendaNature } from "@/lib/retention/natures";

export type AgendaEventContext = {
  natureza: AgendaNature | null;
  servico_id: string | null;
  veiculo_id: string | null;
  duracao_minutos: number | null;
  return_id: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function agendaEventContext(ev: AgendaEventRow): AgendaEventContext {
  const rec = ev as unknown as Record<string, unknown>;
  const meta = asRecord(asRecord(ev.recorrencia_json).meta35_2);
  const uuid = (v: unknown): string | null =>
    typeof v === "string" && v.length > 0 ? v : null;
  const naturezaRaw = rec.natureza ?? meta.natureza ?? rec.origem ?? null;
  const natureza =
    naturezaRaw === "cliente" ||
    naturezaRaw === "negocio" ||
    naturezaRaw === "interno"
      ? naturezaRaw
      : null;
  const duracao = rec.duracao_minutos ?? meta.duracao_minutos;
  return {
    natureza,
    servico_id: uuid(rec.servico_id ?? meta.servico_id),
    veiculo_id: uuid(rec.veiculo_id ?? meta.veiculo_id),
    duracao_minutos:
      typeof duracao === "number" && Number.isFinite(duracao)
        ? duracao
        : null,
    return_id: uuid(rec.return_id ?? meta.return_id),
  };
}
