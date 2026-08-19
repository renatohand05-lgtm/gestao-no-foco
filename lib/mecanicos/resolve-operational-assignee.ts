/**
 * Fonte canônica do responsável operacional vs FKs legadas.
 * Picker/agenda usam mecanicos.id; ordens_servico.mecanico_id e
 * ordem_servico_itens.mecanico_id referenciam profiles.id.
 * RPC os_atribuir_mecanico_atomico espera mecanicos.id.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { librarySegmentForContext } from "../segments/library-segment.ts";
import type { ResolvedSegmentContext } from "../segments/types.ts";
import type { Database } from "../../types/database";

export const ASSIGNEE_UNAVAILABLE_MESSAGE =
  "O mecânico selecionado não está disponível nesta empresa. Selecione novamente.";

export type OperationalAssigneeRole =
  | "mecanico"
  | "profissional"
  | "consultor";

export type OperationalAssignee = {
  mechanicId: string;
  profileId: string | null;
  professionalId: string | null;
  role: OperationalAssigneeRole;
  source: "mecanicos";
};

type MecanicoRow = {
  id: string;
  profile_id: string | null;
  tenant_id: string;
  status: string;
  deleted_at: string | null;
};

function roleForSegment(
  ctx?: Pick<ResolvedSegmentContext, "usesCapabilityEngine" | "productSegment">,
): OperationalAssigneeRole {
  if (!ctx) return "mecanico";
  const segment = librarySegmentForContext(ctx);
  if (segment === "consultoria") return "consultor";
  if (segment === "oficina") return "mecanico";
  return "profissional";
}

function asRow(data: unknown): MecanicoRow | null {
  if (!data || typeof data !== "object") return null;
  const row = data as MecanicoRow;
  if (!row.id) return null;
  return row;
}

export async function resolveOperationalAssignee(input: {
  supabase: SupabaseClient<Database>;
  tenantId: string;
  selectedId: string | null | undefined;
  segmentContext?: Pick<
    ResolvedSegmentContext,
    "usesCapabilityEngine" | "productSegment"
  >;
}): Promise<OperationalAssignee | null> {
  const selectedId = input.selectedId?.trim() || "";
  if (!selectedId) return null;

  const base = input.supabase
    .from("mecanicos" as never)
    .select("id, profile_id, tenant_id, status, deleted_at")
    .eq("tenant_id", input.tenantId)
    .is("deleted_at", null);

  const byId = await base.eq("id", selectedId).maybeSingle();
  if (byId.error) throw new Error(byId.error.message);
  let row = asRow(byId.data);

  if (!row) {
    const byProfile = await input.supabase
      .from("mecanicos" as never)
      .select("id, profile_id, tenant_id, status, deleted_at")
      .eq("tenant_id", input.tenantId)
      .eq("profile_id", selectedId)
      .is("deleted_at", null)
      .maybeSingle();
    if (byProfile.error) throw new Error(byProfile.error.message);
    row = asRow(byProfile.data);
  }

  if (!row) {
    throw new Error(ASSIGNEE_UNAVAILABLE_MESSAGE);
  }
  if (row.status !== "ativo") {
    throw new Error(ASSIGNEE_UNAVAILABLE_MESSAGE);
  }

  return {
    mechanicId: row.id,
    profileId: row.profile_id,
    professionalId: row.profile_id,
    role: roleForSegment(input.segmentContext),
    source: "mecanicos",
  };
}

/** Valor gravável nas FKs de OS/itens (profiles). Nunca mecanicos.id. */
export function osColumnMechanicId(
  assignee: OperationalAssignee | null,
): string | null {
  return assignee?.profileId ?? null;
}
