/**
 * Sprint 24.1 — Tipos locais espelhando migration 20260812.
 */

export type ClienteContatoRow = {
  id: string;
  tenant_id: string;
  cliente_id: string;
  nome: string;
  cargo: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  principal: boolean;
  ativo: boolean;
  observacoes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CrmPipelineStageRow = {
  id: string;
  tenant_id: string;
  empresa_id: string | null;
  stage_key: string;
  label: string;
  sort_order: number;
  active: boolean;
  color: string | null;
  probabilidade_padrao: number | null;
  is_won: boolean;
  is_lost: boolean;
  is_default_pipeline: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CrmOportunidadeStatus = "aberta" | "ganha" | "perdida" | "cancelada";

export type CrmOportunidadeRow = {
  id: string;
  tenant_id: string;
  cliente_id: string;
  empresa_id: string | null;
  filial_id: string | null;
  titulo: string;
  stage_key: string;
  valor_estimado: number | null;
  probabilidade: number | null;
  data_prevista: string | null;
  data_fechamento: string | null;
  origem: string | null;
  responsavel_id: string | null;
  produto_servico: string | null;
  status: CrmOportunidadeStatus;
  motivo_perda: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CrmStageMovementRow = {
  id: string;
  tenant_id: string;
  cliente_id: string | null;
  oportunidade_id: string | null;
  from_stage: string | null;
  to_stage: string;
  motivo: string | null;
  user_id: string | null;
  created_at: string;
};
