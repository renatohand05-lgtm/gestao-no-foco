import { kpiBucket } from "./pipeline.ts";

export const NO_CHANNEL_OPERATOR_COPY =
  "Cliente sem canal de comunicação disponível.";

export type CommunicationKpis = {
  awaiting: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  cancelled: number;
  clientsWithoutWhatsApp: number;
  clientsWithoutEmail: number;
};

export function communicationKpis(input: {
  rows: Array<{ status: string }>;
  clients: Array<{
    telefone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
  }>;
}): CommunicationKpis {
  const kpis: CommunicationKpis = {
    awaiting: 0,
    sent: 0,
    delivered: 0,
    read: 0,
    failed: 0,
    cancelled: 0,
    clientsWithoutWhatsApp: 0,
    clientsWithoutEmail: 0,
  };
  for (const row of input.rows) {
    kpis[kpiBucket(row.status)] += 1;
  }
  for (const c of input.clients) {
    const phone = `${c.whatsapp ?? ""}${c.telefone ?? ""}`.replace(/\D/g, "");
    if (!phone) kpis.clientsWithoutWhatsApp += 1;
    if (!(c.email ?? "").includes("@")) kpis.clientsWithoutEmail += 1;
  }
  return kpis;
}

export function filterCenterRows<
  T extends {
    tenant_id: string;
    cliente_id?: string | null;
    channel: string;
    status: string;
    origin_kind?: string | null;
    template_code?: string | null;
    created_by?: string | null;
    created_at?: string | null;
  },
>(
  rows: T[],
  filters: {
    tenantId: string;
    clienteId?: string;
    channel?: string;
    status?: string;
    origin?: string;
    createdBy?: string;
    from?: string;
    to?: string;
  },
): T[] {
  return rows.filter((row) => {
    if (row.tenant_id !== filters.tenantId) return false;
    if (filters.clienteId && row.cliente_id !== filters.clienteId) return false;
    if (filters.channel && row.channel !== filters.channel) return false;
    if (filters.status && row.status !== filters.status) return false;
    if (filters.origin && row.origin_kind !== filters.origin) return false;
    if (filters.createdBy && row.created_by !== filters.createdBy) return false;
    if (filters.from && (row.created_at ?? "") < filters.from) return false;
    if (filters.to && (row.created_at ?? "") > filters.to) return false;
    return true;
  });
}
