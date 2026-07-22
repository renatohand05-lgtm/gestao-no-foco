import type { CrmFunilStage } from "@/lib/crm/constants";
import type { CrmTarefaStatus, CrmTarefaTipo } from "@/lib/crm/constants";
import type { Cliente } from "@/types/clientes";

export type ClienteCrmFields = {
  classificacao: string | null;
  score: number;
  consultor_id: string | null;
  estagio_funil: CrmFunilStage;
};

export type ClienteWithCrm = Cliente & ClienteCrmFields;

export type ClienteEvento = {
  id: string;
  tenant_id: string;
  cliente_id: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  referencia_tipo: string | null;
  referencia_id: string | null;
  payload: Record<string, unknown>;
  user_id: string | null;
  created_at: string;
};

export type ClienteTarefa = {
  id: string;
  tenant_id: string;
  cliente_id: string;
  tipo: CrmTarefaTipo;
  titulo: string;
  descricao: string | null;
  status: CrmTarefaStatus;
  prioridade: string;
  data_vencimento: string | null;
  responsavel_id: string | null;
  checklist: Array<{ id: string; label: string; done: boolean }>;
  concluida_em: string | null;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ClienteDocumento = {
  id: string;
  tenant_id: string;
  cliente_id: string;
  categoria: string;
  nome_arquivo: string;
  descricao: string | null;
  legenda: string | null;
  storage_path: string;
  mime_type: string | null;
  tamanho_bytes: number | null;
  sha256: string | null;
  referencia_tipo: string | null;
  referencia_id: string | null;
  uploaded_by: string | null;
  deleted_at: string | null;
  created_at: string;
};

export type ClienteAgendamento = {
  id: string;
  tenant_id: string;
  cliente_id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  inicio: string;
  fim: string | null;
  local: string | null;
  responsavel_id: string | null;
  status: string;
  lembrete_minutos: number | null;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Cliente360Resumo = {
  ordens_total: number;
  vendas_total: number;
  receita_total: number;
  ticket_medio: number;
  contas_abertas: number;
  veiculos_total: number;
  ultima_compra: string | null;
  ultimo_contato: string | null;
};

export type TimelineDisplayEvent = ClienteEvento & {
  autor_nome?: string | null;
  sintetico?: boolean;
};

export type Cliente360Ordem = {
  id: string;
  numero: number | null;
  status: string;
  created_at: string;
  valor_total: number;
};

export type Cliente360Venda = {
  id: string;
  numero: number | null;
  status: string;
  total: number;
  created_at: string;
};

export type Cliente360Orcamento = {
  id: string;
  numero: number | null;
  status: string;
  total: number;
  created_at: string;
  origem: "venda" | "os";
};

export type Cliente360Veiculo = {
  id: string;
  placa: string | null;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
};

export type Cliente360Financeiro = {
  id: string;
  descricao: string;
  valor_original: number;
  status: string;
  data_vencimento: string;
};

export type Cliente360Data = {
  tags: string[];
  resumo: Cliente360Resumo;
  ordens: Cliente360Ordem[];
  orcamentos: Cliente360Orcamento[];
  vendas: Cliente360Venda[];
  veiculos: Cliente360Veiculo[];
  financeiro: Cliente360Financeiro[];
  eventos: TimelineDisplayEvent[];
  tarefas: ClienteTarefa[];
  agendamentos: ClienteAgendamento[];
  documentos: ClienteDocumento[];
  observacoes: ClienteEvento[];
};

export type CrmFunilColumnStats = {
  estagio: CrmFunilStage;
  total: number;
  valor_total: number;
};

export type CrmDashboardKpis = {
  total_leads: number;
  novos_clientes: number;
  clientes_ativos: number;
  clientes_perdidos: number;
  clientes_recorrentes: number;
  clientes_inativos: number;
  clientes_sem_retorno: number;
  oportunidades_vencidas: number;
  previsao_fechamento: number;
  receita_crm: number;
  ticket_medio: number;
  receita_por_cliente: number;
  valor_medio_carteira: number;
  taxa_conversao: number;
  tempo_medio_fechamento_dias: number;
  receita_por_vendedor: Array<{
    consultor_id: string | null;
    nome: string;
    receita: number;
    clientes: number;
  }>;
  receita_por_consultor: Array<{
    consultor_id: string | null;
    nome: string;
    receita: number;
    clientes: number;
  }>;
  motivos_perda: Array<{ motivo: string; total: number }>;
  funil: CrmFunilColumnStats[];
  receita_mensal: Array<{ label: string; data: string; value: number }>;
};

export type CrmFunilCard = {
  id: string;
  nome: string;
  documento: string | null;
  email: string | null;
  telefone: string | null;
  estagio_funil: CrmFunilStage;
  score: number;
  classificacao: string | null;
  tags: string[];
  valor_pipeline: number;
  updated_at: string;
};
