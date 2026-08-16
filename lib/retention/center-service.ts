import "server-only";

import { createNotificationOutboxService } from "./outbox-service";
import { communicationKpis, type CommunicationKpis } from "./center";
import type { OutboxRow } from "./types";
import { createClient } from "@/lib/supabase/server";

export async function loadCommunicationCenter(input: {
  tenantId: string;
  from?: string;
  to?: string;
  clienteId?: string;
  channel?: string;
  status?: string;
  origin?: string;
  createdBy?: string;
}): Promise<{ rows: OutboxRow[]; kpis: CommunicationKpis }> {
  const outbox = await createNotificationOutboxService(input.tenantId);
  const rows = await outbox.listCenter({
    from: input.from,
    to: input.to,
    clienteId: input.clienteId,
    channel: input.channel,
    status: input.status,
    origin: input.origin,
    createdBy: input.createdBy,
    limit: 120,
  });
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clientes")
    .select("id, telefone, whatsapp, email")
    .eq("tenant_id", input.tenantId)
    .is("deleted_at", null)
    .limit(800);
  return {
    rows,
    kpis: communicationKpis({
      rows,
      clients: clients ?? [],
    }),
  };
}
