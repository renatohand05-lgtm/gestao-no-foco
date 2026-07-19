import { OS_STATUS_LABELS, type OsStatus } from "@/lib/ordens/os-status";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function formatOsStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return OS_STATUS_LABELS[status as OsStatus] ?? status;
}

export function formatOsEventState(value: string | null | undefined): string {
  if (!value) return "—";
  if (UUID_RE.test(value)) return "registro vinculado";
  return formatOsStatusLabel(value);
}

export function formatOsEventoLine(ev: {
  tipo: string;
  descricao: string;
  estado_anterior: string | null;
  estado_posterior: string | null;
  motivo: string | null;
  created_at: string;
}): string {
  const parts = [ev.tipo, new Date(ev.created_at).toLocaleString("pt-BR")];
  if (ev.estado_anterior || ev.estado_posterior) {
    parts.push(
      `${formatOsEventState(ev.estado_anterior)} → ${formatOsEventState(ev.estado_posterior)}`,
    );
  }
  if (ev.motivo?.trim()) {
    parts.push(`Motivo: ${ev.motivo.trim()}`);
  }
  return parts.join(" · ");
}
