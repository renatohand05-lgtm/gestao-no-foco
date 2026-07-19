/**
 * Datas pt-BR compartilhadas.
 *
 * `formatDateTime` — dateStyle + timeStyle short (aliases de domínio).
 * `formatDateOnly` — só data com noon local (evita shift de fuso).
 *
 * Não unificar com `formatDataReferencia` (clientes): estilo long + T00:00:00.
 */

export function formatDateTime(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
}

export function formatDateOnly(date: string | null | undefined) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(`${date}T12:00:00`));
}
