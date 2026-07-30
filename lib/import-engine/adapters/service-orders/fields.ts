/**
 * Sprint 22.5.1 — Campos-alvo do importador de Ordens de Serviço (Fase 1).
 */
import type { ImportFieldDef } from "../../types/index.ts";

export const SERVICE_ORDERS_IMPORT_MODULE = "ordens_servico";
export const SERVICE_ORDERS_IMPORT_ENTITY = "ordens_servico";

export const SERVICE_ORDERS_IMPORT_FIELDS: ImportFieldDef[] = [
  { key: "os_number", label: "Número da OS", required: true, type: "string" },
  { key: "client", label: "Cliente", required: true, type: "string" },
  { key: "vehicle", label: "Veículo", required: false, type: "string" },
  { key: "plate", label: "Placa", required: false, type: "string" },
  { key: "chassis", label: "Chassi", required: false, type: "string" },
  { key: "mileage", label: "Quilometragem", required: false, type: "number" },
  { key: "services", label: "Serviços", required: false, type: "string" },
  { key: "parts", label: "Peças", required: false, type: "string" },
  { key: "mechanic", label: "Mecânico", required: false, type: "string" },
  { key: "amount", label: "Valor", required: true, type: "currency" },
  {
    key: "status",
    label: "Status",
    required: false,
    type: "enum",
    enumValues: ["aberta", "em_andamento", "concluida", "cancelada"],
  },
  { key: "date", label: "Data", required: true, type: "date" },
  { key: "notes", label: "Observações", required: false, type: "string" },
];
