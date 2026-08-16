import type { ReturnStatus } from "./returns.ts";

export type CustomerReturnRow = {
  id: string;
  tenant_id: string;
  cliente_id: string;
  produto_id: string | null;
  origem_tipo: string | null;
  origem_id: string | null;
  profissional_id: string | null;
  veiculo_id: string | null;
  due_at: string;
  motivo: string | null;
  observacao: string | null;
  status: ReturnStatus | string;
  canal_preferido: string | null;
  regra_origem: string | null;
  last_km: number | null;
  next_km: number | null;
  placa: string | null;
  veiculo_label: string | null;
  last_service_label: string | null;
  last_visit_at: string | null;
  estimated_value: number | null;
  hide_procedure: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  contacted_at: string | null;
  responded_at: string | null;
  appointment_id: string | null;
};

export type CommunicationPreferenceRow = {
  tenant_id: string;
  cliente_id: string;
  whatsapp_enabled: boolean;
  email_enabled: boolean;
  opted_out_at: string | null;
};

export type OutboxRow = {
  id: string;
  tenant_id: string;
  cliente_id: string | null;
  channel: string;
  template_code: string;
  offset_key: string | null;
  entity_type: string;
  entity_id: string | null;
  status: string;
  mode: string;
  idempotency_key: string;
  rendered_preview: string | null;
};

export type RetentionOpsSummary = {
  hoje: number;
  proximos7: number;
  proximos30: number;
  atrasados: number;
  contatados: number;
  agendados: number;
  recuperados: number;
  semAgendamento: number;
  aguardandoContato: number;
  clienteRespondeu: number;
  receitaPotencial: number | null;
};
