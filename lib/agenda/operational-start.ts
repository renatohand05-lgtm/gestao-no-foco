/**
 * Regras puras — Agenda → operação. Sem criar OS no agendamento.
 * Testável em Node sem Supabase.
 */

export type VehiclePickResult =
  | { ok: true; veiculoId: string | null }
  | { ok: false; message: string };

export function requireAgendaVehicleId(input: {
  vehiclesRequired: boolean;
  natureza: string;
  clienteId: string | null | undefined;
  veiculoId: string | null | undefined;
}): { ok: true } | { ok: false; message: string } {
  if (!input.vehiclesRequired || input.natureza !== "cliente") {
    return { ok: true };
  }
  if (!input.clienteId) {
    return { ok: false, message: "Cliente é obrigatório no agendamento de atendimento." };
  }
  if (!input.veiculoId) {
    return {
      ok: false,
      message: "Selecione o veículo para este cliente.",
    };
  }
  return { ok: true };
}

export function assertVehicleOwnership(input: {
  currentTenantId: string;
  veiculoTenantId: string | null | undefined;
  selectedClienteId: string;
  veiculoClienteId: string | null | undefined;
}): { ok: true } | { ok: false; message: string } {
  if (!input.veiculoTenantId || input.veiculoTenantId !== input.currentTenantId) {
    return { ok: false, message: "Veículo inválido para este tenant." };
  }
  if (!input.veiculoClienteId || input.veiculoClienteId !== input.selectedClienteId) {
    return {
      ok: false,
      message: "Veículo não pertence ao cliente informado.",
    };
  }
  return { ok: true };
}

export function pickScheduledVehicle(input: {
  vehiclesRequired: boolean;
  eventVeiculoId: string | null;
  clientVehicleIds: string[];
}): VehiclePickResult {
  if (!input.vehiclesRequired) {
    return { ok: true, veiculoId: null };
  }
  if (input.eventVeiculoId) {
    if (
      input.clientVehicleIds.length > 0 &&
      !input.clientVehicleIds.includes(input.eventVeiculoId)
    ) {
      return {
        ok: false,
        message: "Veículo do agendamento não pertence a este cliente.",
      };
    }
    return { ok: true, veiculoId: input.eventVeiculoId };
  }
  if (input.clientVehicleIds.length === 1) {
    return { ok: true, veiculoId: input.clientVehicleIds[0] };
  }
  if (input.clientVehicleIds.length > 1) {
    return {
      ok: false,
      message: "Selecione o veículo no agendamento antes de iniciar o atendimento.",
    };
  }
  return {
    ok: false,
    message: "Cadastre um veículo rápido para este cliente antes de iniciar.",
  };
}

export function shouldCreateWorkOrderFromAgenda(input: {
  oficinaUx: boolean;
  hasWorkOrders: boolean;
}): boolean {
  return input.oficinaUx || input.hasWorkOrders;
}

export function agendaStatusAfterOperationalStart(
  mode: "arrived" | "start",
): "cliente_chegou" | "em_atendimento" {
  return mode === "arrived" ? "cliente_chegou" : "em_atendimento";
}
