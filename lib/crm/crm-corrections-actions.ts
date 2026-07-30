"use server";

import { getCurrentProfile } from "@/lib/auth/session";
import {
  createEnterpriseContext,
  createRbacSupabaseAdapter,
} from "@/lib/enterprise";
import { createClienteContatoService } from "@/lib/crm/enterprise/contato-service";
import { createCrmOportunidadeService } from "@/lib/crm/enterprise/oportunidade-service";
import { createCrmPipelineStageService } from "@/lib/crm/enterprise/pipeline-stage-service";
import { sanitizeCrmFilter } from "@/lib/crm/enterprise/filter-engine";
import type { ContatoInput } from "@/lib/crm/enterprise/contato-service";
import type { OportunidadeInput } from "@/lib/crm/enterprise/oportunidade-service";
import type { PipelineStageInput } from "@/lib/crm/enterprise/pipeline-stage-service";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

async function resolveAuth(tenantSlug: string, need: string[]) {
  const tenant = await requireTenant(tenantSlug);
  const profile = await getCurrentProfile();
  if (!profile?.id) throw new Error("Sessão ausente.");
  const client = await createClient();
  const rbac = createRbacSupabaseAdapter(client);
  const snap = await rbac.resolveAuthorizationSnapshot(tenant.id, profile.id);
  const permissions = snap.permissions ?? [];
  const ok = need.some(
    (p) =>
      permissions.includes(p) ||
      permissions.includes("crm.visualizar") ||
      permissions.includes("crm.editar") ||
      permissions.includes("crm.criar"),
  );
  if (!ok) throw new Error(`Sem permissão: ${need.join(" | ")}`);
  createEnterpriseContext({
    tenantId: tenant.id,
    userId: profile.id,
    roles: snap.roles ?? [],
    permissions,
    source: "server_action",
  });
  return { tenant, profile, permissions };
}

export async function listPipelineStagesAction(
  tenantSlug: string,
  empresaId?: string | null,
) {
  const auth = await resolveAuth(tenantSlug, [
    "crm.pipeline.visualizar",
    "crm.visualizar",
  ]);
  const svc = await createCrmPipelineStageService(auth.tenant.id);
  return svc.listFromDatabase(empresaId ?? null);
}

export async function seedPipelineStagesAction(
  tenantSlug: string,
  empresaId?: string | null,
) {
  const auth = await resolveAuth(tenantSlug, ["crm.pipeline.configurar", "crm.editar"]);
  const svc = await createCrmPipelineStageService(auth.tenant.id);
  return svc.seedDefaults(auth.profile.id, empresaId ?? null);
}

export async function upsertPipelineStageAction(
  tenantSlug: string,
  input: PipelineStageInput,
) {
  const auth = await resolveAuth(tenantSlug, ["crm.pipeline.configurar", "crm.editar"]);
  const svc = await createCrmPipelineStageService(auth.tenant.id);
  return svc.upsertStage(input, auth.profile.id);
}

export async function deactivatePipelineStageAction(
  tenantSlug: string,
  stageKey: string,
  empresaId?: string | null,
) {
  const auth = await resolveAuth(tenantSlug, ["crm.pipeline.configurar", "crm.editar"]);
  const svc = await createCrmPipelineStageService(auth.tenant.id);
  await svc.deactivateStage(stageKey, empresaId ?? null);
  return { ok: true as const };
}

export async function listClienteContatosAction(
  tenantSlug: string,
  clienteId: string,
) {
  const auth = await resolveAuth(tenantSlug, ["clientes.visualizar", "crm.visualizar"]);
  const svc = await createClienteContatoService(auth.tenant.id);
  return svc.listByCliente(clienteId);
}

export async function createClienteContatoAction(
  tenantSlug: string,
  clienteId: string,
  input: ContatoInput,
) {
  const auth = await resolveAuth(tenantSlug, ["clientes.editar", "crm.editar"]);
  const svc = await createClienteContatoService(auth.tenant.id);
  return svc.create(clienteId, input, auth.profile.id);
}

export async function updateClienteContatoAction(
  tenantSlug: string,
  contatoId: string,
  input: Partial<ContatoInput>,
) {
  const auth = await resolveAuth(tenantSlug, ["clientes.editar", "crm.editar"]);
  const svc = await createClienteContatoService(auth.tenant.id);
  return svc.update(contatoId, input, auth.profile.id);
}

export async function deleteClienteContatoAction(
  tenantSlug: string,
  contatoId: string,
) {
  const auth = await resolveAuth(tenantSlug, ["clientes.editar", "crm.editar"]);
  const svc = await createClienteContatoService(auth.tenant.id);
  await svc.softDelete(contatoId, auth.profile.id);
  return { ok: true };
}

export async function createOportunidadeAction(
  tenantSlug: string,
  input: OportunidadeInput,
) {
  const auth = await resolveAuth(tenantSlug, [
    "crm.oportunidades.criar",
    "crm.criar",
  ]);
  // Sanitize empresa/filial from client without allow-list → ignore
  const filters = sanitizeCrmFilter({
    raw: {
      empresaIds: input.empresa_id ? [input.empresa_id] : undefined,
      filialIds: input.filial_id ? [input.filial_id] : undefined,
      responsavelIds: input.responsavel_id ? [input.responsavel_id] : undefined,
    },
    authorizedEmpresaIds: null,
    authorizedFilialIds: null,
    authorizedResponsavelIds: null,
  });
  const svc = await createCrmOportunidadeService(auth.tenant.id);
  return svc.create(
    {
      ...input,
      empresa_id: filters.empresaIds?.[0] ?? null,
      filial_id: filters.filialIds?.[0] ?? null,
      responsavel_id: filters.responsavelIds?.[0] ?? input.responsavel_id ?? null,
    },
    auth.profile.id,
  );
}

export async function moveOportunidadeStageAction(
  tenantSlug: string,
  args: {
    oportunidadeId: string;
    toStage: string;
    status?: "aberta" | "ganha" | "perdida" | "cancelada";
    motivoPerda?: string | null;
    dataFechamento?: string | null;
  },
) {
  const auth = await resolveAuth(tenantSlug, [
    "crm.oportunidades.editar",
    "crm.editar",
  ]);
  const svc = await createCrmOportunidadeService(auth.tenant.id);
  return svc.moveStage({ ...args, userId: auth.profile.id });
}
