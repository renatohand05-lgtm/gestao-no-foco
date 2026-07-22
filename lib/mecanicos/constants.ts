export const MECANICO_ESPECIALIDADES = [
  "mecanica_geral",
  "suspensao",
  "freios",
  "motor",
  "cambio",
  "eletrica",
  "injecao",
  "alinhamento",
  "ar_condicionado",
  "diagnostico",
  "outras",
] as const;

export type MecanicoEspecialidade = (typeof MECANICO_ESPECIALIDADES)[number];

export const MECANICO_ESPECIALIDADE_LABELS: Record<
  MecanicoEspecialidade,
  string
> = {
  mecanica_geral: "Mecânica geral",
  suspensao: "Suspensão",
  freios: "Freios",
  motor: "Motor",
  cambio: "Câmbio",
  eletrica: "Elétrica",
  injecao: "Injeção",
  alinhamento: "Alinhamento",
  ar_condicionado: "Ar-condicionado",
  diagnostico: "Diagnóstico",
  outras: "Outras",
};

export const MECANICO_VINCULOS = [
  "clt",
  "pj",
  "autonomo",
  "comissao",
  "diaria",
  "outro",
] as const;

export type MecanicoVinculo = (typeof MECANICO_VINCULOS)[number];

export const MECANICO_VINCULO_LABELS: Record<MecanicoVinculo, string> = {
  clt: "CLT",
  pj: "PJ",
  autonomo: "Autônomo",
  comissao: "Comissão",
  diaria: "Diária",
  outro: "Outro",
};

export const MECANICO_STATUS = ["ativo", "inativo", "arquivado"] as const;
export type MecanicoStatus = (typeof MECANICO_STATUS)[number];

export const MECANICO_DISPONIBILIDADE = [
  "disponivel",
  "ocupado",
  "pausa",
  "ausente",
  "ferias",
  "afastado",
  "folga",
] as const;

export type MecanicoDisponibilidade =
  (typeof MECANICO_DISPONIBILIDADE)[number];

export const MECANICO_DISPONIBILIDADE_LABELS: Record<
  MecanicoDisponibilidade,
  string
> = {
  disponivel: "Disponível",
  ocupado: "Ocupado",
  pausa: "Pausa",
  ausente: "Ausente",
  ferias: "Férias",
  afastado: "Afastado",
  folga: "Folga",
};

export const OS_MECANICO_PAPEIS = [
  "principal",
  "auxiliar",
  "responsavel_tecnico",
] as const;

export type OsMecanicoPapel = (typeof OS_MECANICO_PAPEIS)[number];

export function calcCustoMensal(input: {
  salario_base?: number;
  pro_labore?: number;
  adicional?: number;
  comissao?: number;
  horas_extras?: number;
  beneficios?: number;
  cesta_basica?: number;
  vale_transporte?: number;
  vale_refeicao?: number;
  encargos?: number;
  impostos?: number;
  bonus?: number;
  descontos?: number;
}): number {
  const sum =
    (input.salario_base ?? 0) +
    (input.pro_labore ?? 0) +
    (input.adicional ?? 0) +
    (input.comissao ?? 0) +
    (input.horas_extras ?? 0) +
    (input.beneficios ?? 0) +
    (input.cesta_basica ?? 0) +
    (input.vale_transporte ?? 0) +
    (input.vale_refeicao ?? 0) +
    (input.encargos ?? 0) +
    (input.impostos ?? 0) +
    (input.bonus ?? 0) -
    (input.descontos ?? 0);
  return Math.max(Math.round(sum * 100) / 100, 0);
}

export function calcCustoHora(
  custoMensal: number,
  horasBase: number,
): number {
  if (!horasBase || horasBase <= 0) return 0;
  return Math.round((custoMensal / horasBase) * 10000) / 10000;
}
