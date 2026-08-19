/**
 * Tipo de relacionamento do cliente — controla formulário e 360.
 * Não é permissão. Persistido em `clientes.origem`.
 */
export type ClientRelationship = "atendimento" | "negocio";

const BUSINESS_ORIGINS = new Set([
  "negocio",
  "lead",
  "crm",
  "prospeccao",
  "indicação",
  "indicacao",
  "parceiro",
]);

const ATTENDANCE_ORIGINS = new Set([
  "atendimento",
  "ordem_de_servico",
  "agenda",
  "balcao",
  "walkin",
]);

export function relationshipFromOrigem(
  origem: string | null | undefined,
): ClientRelationship {
  const key = (origem ?? "").trim().toLowerCase();
  if (BUSINESS_ORIGINS.has(key)) return "negocio";
  if (ATTENDANCE_ORIGINS.has(key)) return "atendimento";
  return "atendimento";
}

export function origemForRelationship(mode: ClientRelationship): string {
  return mode === "negocio" ? "negocio" : "atendimento";
}
