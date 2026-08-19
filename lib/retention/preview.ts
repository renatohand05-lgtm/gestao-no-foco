import { osServiceSummary, osVehicleSummary } from "./os-message-context.ts";
import { renderTemplate, templateFor } from "./templates.ts";

export function buildServiceReadyPreview(input: {
  segment?: string | null;
  clienteNome: string;
  empresaNome: string;
  itens?: Array<{ descricao?: string | null; aprovacao_status?: string | null }>;
  marca?: string | null;
  modelo?: string | null;
  placa?: string | null;
  hideProcedure?: boolean;
}): string {
  return renderTemplate(
    templateFor({
      code: "SERVICE_READY",
      segment: input.segment,
      hideProcedure: input.hideProcedure,
    }),
    {
      cliente_nome: input.clienteNome,
      empresa_nome: input.empresaNome,
      servico: osServiceSummary(input.itens ?? [], input.segment),
      veiculo: osVehicleSummary({
        marca: input.marca,
        modelo: input.modelo,
        placa: input.placa,
      }),
      modelo: input.modelo ?? "",
      placa: input.placa ?? "",
    },
  );
}
