/**
 * Sprint 35.1 — Gaps reais por segmento (não implementar automaticamente).
 */
import type { ProductSegmentId } from "./types.ts";
import type { ModuleStatusReal, ProductCapability } from "./capabilities.ts";

export type SegmentGapRow = {
  capability: ProductCapability | string;
  module: string;
  status: ModuleStatusReal;
  note: string;
};

const GAPS: Record<ProductSegmentId, SegmentGapRow[]> = {
  oficina: [
    { capability: "work_orders", module: "Ordens de Serviço", status: "READY", note: "Módulo atual" },
    { capability: "workshop_mechanics", module: "Mecânicos", status: "READY", note: "Módulo atual" },
    { capability: "vehicles", module: "Veículos", status: "READY", note: "Cadastro existente" },
    { capability: "commissions", module: "Comissões", status: "PARTIAL", note: "Já existe na oficina; sem folha" },
  ],
  consultoria: [
    { capability: "crm", module: "CRM", status: "READY", note: "Módulo atual" },
    { capability: "catalog", module: "Serviços", status: "READY", note: "Mesmo catálogo, label Serviços" },
    { capability: "projects", module: "Projetos", status: "MISSING", note: "Sem módulo dedicado — não inventar" },
    { capability: "work_orders", module: "OS automotiva", status: "READY", note: "Oculta por padrão" },
  ],
  barbearia: [
    { capability: "appointments", module: "Agenda", status: "READY", note: "Módulo atual" },
    { capability: "customers", module: "Clientes", status: "READY", note: "Módulo atual" },
    { capability: "catalog", module: "Serviços", status: "READY", note: "Catálogo existente" },
    { capability: "professionals", module: "Barbeiros", status: "REUSABLE", note: "Reusa cadastro mecanicos; UI /profissionais" },
    { capability: "commissions", module: "Comissões", status: "PARTIAL", note: "Mesma base da oficina; sem folha" },
    { capability: "recurring_services", module: "Fidelidade", status: "PARTIAL", note: "Retornos 35.2 cobrem reativação operacional; pacote recorrente continua parcial" },
    { capability: "customer_returns", module: "Retornos previstos", status: "READY", note: "Sprint 35.2" },
  ],
  lava_rapido: [
    { capability: "vehicles", module: "Veículos", status: "READY", note: "Reusa infra da oficina" },
    { capability: "service_checklist", module: "Checklist", status: "READY", note: "Checklist da OS, UI = Atendimentos" },
    { capability: "work_orders", module: "Atendimentos", status: "READY", note: "ON por padrão; mesma tabela OS, copy Atendimentos" },
    { capability: "packages", module: "Pacotes", status: "PARTIAL", note: "Catálogo, sem produto de pacote dedicado" },
    { capability: "professionals", module: "Profissionais", status: "REUSABLE", note: "UI /profissionais" },
  ],
  clinica_estetica: [
    { capability: "appointments", module: "Agenda", status: "READY", note: "Módulo atual" },
    { capability: "catalog", module: "Procedimentos", status: "READY", note: "Label do catálogo" },
    { capability: "packages", module: "Pacotes", status: "PARTIAL", note: "Sem motor de pacote clínico" },
    { capability: "patient_records", module: "Prontuário", status: "MISSING", note: "OFF — sem dados de saúde" },
  ],
  consultorio_odontologico: [
    { capability: "customers", module: "Pacientes", status: "READY", note: "Mesmo cadastro, label Pacientes" },
    { capability: "accounts_receivable", module: "Contas a receber", status: "READY", note: "Financeiro 34.9" },
    { capability: "patient_records", module: "Prontuário / odontograma", status: "MISSING", note: "OFF nesta sprint" },
    { capability: "treatment_plans", module: "Plano clínico", status: "MISSING", note: "OFF nesta sprint" },
  ],
  restaurante: [
    { capability: "work_orders", module: "Comandas", status: "READY", note: "Mesma tabela OS, copy Comanda" },
    { capability: "professionals", module: "Garçons", status: "REUSABLE", note: "Reusa cadastro mecanicos; UI /profissionais" },
    { capability: "catalog", module: "Cardápio", status: "READY", note: "Catálogo sugerido com pratos, bebidas e combos" },
    { capability: "commissions", module: "Comissões", status: "PARTIAL", note: "Mesma base da oficina; sem folha" },
    { capability: "operations_board", module: "Quadro operacional", status: "READY", note: "Fase 2: Salão/mesas. Fase 3: Cozinha/KDS. Fase 4: Delivery" },
    { capability: "appointments", module: "Reservas de mesa", status: "MISSING", note: "Controle de mesas é operacional (Fase 2); reserva antecipada por cliente ainda não" },
    { capability: "packages", module: "Combos", status: "PARTIAL", note: "Catálogo suporta combo; sem motor de composição de itens" },
    { capability: "work_orders", module: "Delivery", status: "READY", note: "Fase 4 — fila em preparo/pronto/entregue, endereço puxado do cliente" },
  ],
};

export function getSegmentGaps(id: ProductSegmentId): readonly SegmentGapRow[] {
  return GAPS[id];
}

export function listAllSegmentGaps(): Record<ProductSegmentId, readonly SegmentGapRow[]> {
  return GAPS;
}
