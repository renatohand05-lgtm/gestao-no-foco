/**
 * Sprint 34.9 — Tipos de beneficiário em Contas a Pagar.
 */

export const BENEFICIARIO_TIPOS = [
  "fornecedor",
  "funcionario",
  "mecanico",
  "vendedor",
  "prestador",
  "locador",
  "concessionaria",
  "governo",
  "outro",
] as const;

export type BeneficiarioTipo = (typeof BENEFICIARIO_TIPOS)[number];

/** Tipos cadastráveis em financeiro_beneficiarios (não fornecedor/mecânico/equipe). */
export const BENEFICIARIO_CADASTRO_TIPOS = [
  "prestador",
  "locador",
  "concessionaria",
  "governo",
  "outro",
] as const;

export type BeneficiarioCadastroTipo =
  (typeof BENEFICIARIO_CADASTRO_TIPOS)[number];

export const BENEFICIARIO_TIPO_LABEL: Record<BeneficiarioTipo, string> = {
  fornecedor: "Fornecedor",
  funcionario: "Funcionário / Equipe",
  mecanico: "Mecânico",
  vendedor: "Vendedor",
  prestador: "Prestador / Parceiro",
  locador: "Locador",
  concessionaria: "Concessionária / Utilidade",
  governo: "Governo / Tributo",
  outro: "Outro",
};

export function isBeneficiarioCadastroTipo(
  value: string | null | undefined,
): value is BeneficiarioCadastroTipo {
  return (BENEFICIARIO_CADASTRO_TIPOS as readonly string[]).includes(
    value ?? "",
  );
}

export function isBeneficiarioTipo(
  value: string | null | undefined,
): value is BeneficiarioTipo {
  return (BENEFICIARIO_TIPOS as readonly string[]).includes(value ?? "");
}
