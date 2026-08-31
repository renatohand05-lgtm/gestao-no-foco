/**
 * Sprint 30.2 — Rótulos Equipe (papéis, status) + presets de departamento por segmento.
 * Sem imports de path alias — seguro para Next e testes Node (mesma convenção de
 * config/segment-labels.ts).
 */

import { getOrgTeamLabels } from "../../config/segment-labels.ts";
import type {
  InvitationStatus,
  JobTitleStatus,
  MemberStatus,
  MembershipRole,
  TeamStatus,
} from "./types.ts";

export const MEMBERSHIP_ROLE_LABELS: Readonly<Record<MembershipRole, string>> = {
  owner: "Proprietário",
  admin: "Administrador",
  manager: "Gerente",
  member: "Funcionário",
};

export const MEMBERSHIP_ROLE_DESCRIPTIONS: Readonly<Record<MembershipRole, string>> = {
  owner: "Acesso total ao tenant. Precisa existir pelo menos um proprietário ativo.",
  admin: "Acesso administrativo amplo — gerencia equipe, configurações e módulos.",
  manager: "Gestão operacional do dia a dia dos módulos do negócio.",
  member:
    "Sub-login liberado pelo proprietário: lançar venda, abrir/editar OS e usar a agenda. Sem acesso a financeiro, DRE ou relatórios contábeis.",
};

export const MEMBER_STATUS_LABELS: Readonly<Record<MemberStatus, string>> = {
  active: "Ativo",
  inactive: "Inativo",
};

export const TEAM_STATUS_LABELS: Readonly<Record<TeamStatus, string>> = {
  active: "Ativa",
  inactive: "Inativa",
  archived: "Arquivada",
};

export const JOB_TITLE_STATUS_LABELS: Readonly<Record<JobTitleStatus, string>> = {
  active: "Ativo",
  inactive: "Inativo",
};

export const INVITATION_STATUS_LABELS: Readonly<Record<InvitationStatus, string>> = {
  pending: "Pendente",
  accepted: "Aceito",
  expired: "Expirado",
  cancelled: "Cancelado",
};

/** Sprint 30.2 — presets de departamento/equipe por segmento (fonte única: config/segment-labels.ts). */
export function getDepartmentPresets(
  segment: string | null | undefined,
): readonly string[] {
  return getOrgTeamLabels(segment).departmentPresets;
}

export function membershipRoleLabel(role: string | null | undefined): string {
  if (!role) return "—";
  return (
    MEMBERSHIP_ROLE_LABELS[role as MembershipRole] ??
    role.charAt(0).toUpperCase() + role.slice(1)
  );
}

export function memberStatusLabel(status: string | null | undefined): string {
  if (!status) return MEMBER_STATUS_LABELS.active;
  return MEMBER_STATUS_LABELS[status as MemberStatus] ?? status;
}

export function teamStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return TEAM_STATUS_LABELS[status as TeamStatus] ?? status;
}

export function jobTitleStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return JOB_TITLE_STATUS_LABELS[status as JobTitleStatus] ?? status;
}

export function invitationStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return INVITATION_STATUS_LABELS[status as InvitationStatus] ?? status;
}

export const MEMBERSHIP_ROLE_OPTIONS: readonly {
  value: MembershipRole;
  label: string;
}[] = (Object.keys(MEMBERSHIP_ROLE_LABELS) as MembershipRole[]).map((value) => ({
  value,
  label: MEMBERSHIP_ROLE_LABELS[value],
}));

/** Opções de papel no formulário de convite (sem Proprietário). */
export const INVITABLE_MEMBERSHIP_ROLE_OPTIONS: readonly {
  value: Exclude<MembershipRole, "owner">;
  label: string;
}[] = MEMBERSHIP_ROLE_OPTIONS.filter(
  (option): option is { value: Exclude<MembershipRole, "owner">; label: string } =>
    option.value !== "owner",
);
