import { toStoredWhatsapp } from "../clientes/phone.ts";

/**
 * Sprint 35.2.1 — helpers de cadastro rápido.
 * Sem inventar dados; só reusa contexto da navegação.
 */

export const FAST_RETURN_PRESETS = [
  { key: "15d", days: 15, months: null, label: "15 dias" },
  { key: "30d", days: 30, months: null, label: "30 dias" },
  { key: "3m", days: null, months: 3, label: "3 meses" },
  { key: "6m", days: 182, months: 6, label: "6 meses" },
  { key: "1y", days: 365, months: 12, label: "1 ano" },
] as const;

/** Presets de retorno automotivo (data, km ou o que ocorrer primeiro). */
export const AUTOMOTIVE_RETURN_PRESETS = [
  { key: "30d", label: "30 dias", presetDays: 30, intervalMonths: null, mileageKm: null },
  { key: "3m", label: "3 meses", presetDays: null, intervalMonths: 3, mileageKm: null },
  { key: "6m", label: "6 meses", presetDays: null, intervalMonths: 6, mileageKm: null },
  { key: "12m", label: "12 meses", presetDays: null, intervalMonths: 12, mileageKm: null },
  { key: "5k", label: "5.000 km", presetDays: null, intervalMonths: null, mileageKm: 5000 },
  { key: "10k", label: "10.000 km", presetDays: null, intervalMonths: null, mileageKm: 10000 },
  {
    key: "first",
    label: "6 meses / 10.000 km",
    presetDays: null,
    intervalMonths: 6,
    mileageKm: 10000,
  },
] as const;

export type AgendaCreateContext = {
  natureza?: "cliente" | "negocio" | "interno";
  clienteId?: string | null;
  servicoId?: string | null;
  profissionalId?: string | null;
  returnId?: string | null;
  inicioLocal?: string | null;
  from?: string | null;
};

export function parseAgendaCreateContext(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): AgendaCreateContext {
  const get = (key: string) => {
    if (params instanceof URLSearchParams) return params.get(key);
    const raw = params[key];
    if (Array.isArray(raw)) return raw[0] ?? null;
    return raw ?? null;
  };
  const naturezaRaw = get("natureza");
  const natureza =
    naturezaRaw === "cliente" ||
    naturezaRaw === "negocio" ||
    naturezaRaw === "interno"
      ? naturezaRaw
      : get("cliente_id")
        ? "cliente"
        : undefined;
  return {
    natureza,
    clienteId: get("cliente_id"),
    servicoId: get("servico_id"),
    profissionalId: get("profissional_id"),
    returnId: get("return_id"),
    inicioLocal: get("inicio"),
    from: get("from"),
  };
}

export function agendaHref(
  tenantSlug: string,
  ctx: Partial<AgendaCreateContext>,
): string {
  const q = new URLSearchParams();
  if (ctx.natureza) q.set("natureza", ctx.natureza);
  if (ctx.clienteId) q.set("cliente_id", ctx.clienteId);
  if (ctx.servicoId) q.set("servico_id", ctx.servicoId);
  if (ctx.profissionalId) q.set("profissional_id", ctx.profissionalId);
  if (ctx.returnId) q.set("return_id", ctx.returnId);
  if (ctx.inicioLocal) q.set("inicio", ctx.inicioLocal);
  const qs = q.toString();
  return qs ? `/${tenantSlug}/agenda?${qs}` : `/${tenantSlug}/agenda`;
}

export function novoClienteFromAgendaHref(tenantSlug: string): string {
  return `/${tenantSlug}/clientes/novo?from=agenda`;
}

export function shouldReturnToAgenda(from?: string | null): boolean {
  return from === "agenda";
}

/** Um telefone informado pelo usuário: grava nos canais conhecidos, sem inventar outro. */
export function contactFromQuickPhone(phone: string): {
  whatsapp: string;
  telefone: string;
} {
  const stored = toStoredWhatsapp(phone) ?? phone.trim();
  return { whatsapp: stored, telefone: stored };
}

export const CLIENT_ESSENTIAL_FIELDS = ["nome", "whatsapp", "email"] as const;
export const SERVICE_ESSENTIAL_FIELDS = [
  "nome",
  "preco_venda",
  "tempo_estimado_minutos",
] as const;
export const PROFESSIONAL_ESSENTIAL_FIELDS = [
  "nome_completo",
  "especialidade",
] as const;
export const APPOINTMENT_ESSENTIAL_FIELDS = [
  "cliente_id",
  "servico_id",
  "inicio",
  "responsavel_id",
] as const;

export function intervalFromFastPreset(key: string): {
  presetDays: number | null;
  intervalMonths: number | null;
} {
  const preset = FAST_RETURN_PRESETS.find((item) => item.key === key);
  if (!preset) return { presetDays: 30, intervalMonths: null };
  if (preset.months) {
    return { presetDays: null, intervalMonths: preset.months };
  }
  return { presetDays: preset.days, intervalMonths: null };
}

export function slotInicioLocal(day: string, time = "09:00"): string {
  return `${day}T${time}`;
}
