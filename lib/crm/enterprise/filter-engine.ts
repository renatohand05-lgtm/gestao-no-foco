/**
 * Sprint 24.1 — Filtros CRM com allow-list server-side.
 */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CrmFilterInput = {
  empresaIds?: string[];
  filialIds?: string[];
  responsavelIds?: string[];
  stageKeys?: string[];
  status?: string[];
  origem?: string[];
  segmento?: string[];
  periodFrom?: string;
  periodTo?: string;
  tenantId?: string;
  tenant_id?: string;
};

export type CrmSanitizedFilter = {
  empresaIds?: string[];
  filialIds?: string[];
  responsavelIds?: string[];
  stageKeys?: string[];
  status?: string[];
  origem?: string[];
  segmento?: string[];
  periodFrom?: string | null;
  periodTo?: string | null;
};

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function intersect(
  requested: string[] | undefined,
  allowed: readonly string[] | null | undefined,
): string[] | undefined {
  if (!requested?.length) return undefined;
  if (!allowed || allowed.length === 0) {
    // Sem allow-list: ignora IDs do client (não confiar)
    return undefined;
  }
  const set = new Set(allowed);
  const out = requested.filter((id) => set.has(id) && isUuid(id));
  return out.length ? out : undefined;
}

function isIsoDate(value: string | undefined): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return Number.isFinite(Date.parse(`${value}T00:00:00.000Z`));
}

/**
 * Sanitiza filtros do client.
 * Rejeita tenantId injetado (lança).
 * Empresa/filial/responsável só passam na allow-list do servidor.
 */
export function sanitizeCrmFilter(args: {
  raw?: CrmFilterInput | null;
  authorizedEmpresaIds?: readonly string[] | null;
  authorizedFilialIds?: readonly string[] | null;
  authorizedResponsavelIds?: readonly string[] | null;
  allowedStageKeys?: readonly string[] | null;
}): CrmSanitizedFilter {
  const raw = args.raw ?? {};
  if ("tenantId" in raw || "tenant_id" in raw) {
    throw new Error("tenantId do client é rejeitado — isolamento server-side.");
  }

  const stageKeys = raw.stageKeys?.filter((k) =>
    args.allowedStageKeys?.length
      ? args.allowedStageKeys.includes(k)
      : /^[a-z][a-z0-9_]{0,62}$/.test(k),
  );

  return {
    empresaIds: intersect(raw.empresaIds, args.authorizedEmpresaIds),
    filialIds: intersect(raw.filialIds, args.authorizedFilialIds),
    responsavelIds: intersect(raw.responsavelIds, args.authorizedResponsavelIds),
    stageKeys: stageKeys?.length ? stageKeys : undefined,
    status: raw.status?.filter((s) =>
      ["aberta", "ganha", "perdida", "cancelada", "ativo", "inativo"].includes(s),
    ),
    origem: raw.origem?.map((o) => o.trim()).filter(Boolean).slice(0, 20),
    segmento: raw.segmento?.map((s) => s.trim()).filter(Boolean).slice(0, 20),
    periodFrom: isIsoDate(raw.periodFrom) ? raw.periodFrom! : null,
    periodTo: isIsoDate(raw.periodTo) ? raw.periodTo! : null,
  };
}

export function assertCrmTenantMatch(
  expectedTenantId: string,
  rowTenantId: string | null | undefined,
  context: string,
): void {
  if (!rowTenantId || rowTenantId !== expectedTenantId) {
    throw new Error(`Cross-tenant bloqueado em ${context}.`);
  }
}

/** Regras puras de oportunidade (sem inventar). */
export function validateOportunidadeTransition(args: {
  status: "aberta" | "ganha" | "perdida" | "cancelada";
  valorEstimado?: number | null;
  probabilidade?: number | null;
  dataFechamento?: string | null;
  motivoPerda?: string | null;
  requireMotivoPerda?: boolean;
}): { ok: true } | { ok: false; error: string } {
  if (args.valorEstimado != null && (!Number.isFinite(args.valorEstimado) || args.valorEstimado < 0)) {
    return { ok: false, error: "Valor estimado não pode ser negativo." };
  }
  if (
    args.probabilidade != null &&
    (!Number.isFinite(args.probabilidade) ||
      args.probabilidade < 0 ||
      args.probabilidade > 100)
  ) {
    return { ok: false, error: "Probabilidade deve estar entre 0 e 100." };
  }
  if (args.status === "ganha" && !args.dataFechamento) {
    return { ok: false, error: "Ganho exige data de fechamento." };
  }
  if (
    args.status === "perdida" &&
    args.requireMotivoPerda !== false &&
    !args.motivoPerda?.trim()
  ) {
    return { ok: false, error: "Perdido exige motivo da perda." };
  }
  return { ok: true };
}

export function ensureSinglePrincipalContatos(
  contatos: Array<{ id: string; principal: boolean; ativo: boolean }>,
): { ok: true } | { ok: false; error: string } {
  const ativos = contatos.filter((c) => c.ativo);
  const principals = ativos.filter((c) => c.principal);
  if (ativos.length > 0 && principals.length === 0) {
    return { ok: false, error: "Quando há contatos ativos, um deve ser principal." };
  }
  if (principals.length > 1) {
    return { ok: false, error: "Apenas um contato principal é permitido." };
  }
  return { ok: true };
}
