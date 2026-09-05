/**
 * Catálogo das regras da Reforma Tributária (EC 132/2023 + LC 214/2025)
 * vigentes a partir de 01/01/2027.
 *
 * Princípio do módulo inteiro: nenhuma alíquota é inventada. Cada parâmetro
 * aqui é OU (a) um fato já determinado em lei/resolução, com a referência
 * legal anotada, OU (b) omitido — e nesse caso a versão de regra fica em
 * "draft" e o motor recusa calcular até alguém preencher o valor real
 * (ver requireNumberParameter em tax-rule-registry.ts).
 *
 * Fatos confirmados usados aqui (posição pública em 2026, sujeita a
 * atualização caso o Senado publique a resolução de alíquotas de
 * referência antes de 2027):
 *  - PIS/Cofins são extintos em 2027; a CBS assume sua posição.
 *  - IBS é cobrado a 0,1% em 2027 e 2028 (dividido 0,05% estados / 0,05%
 *    municípios) — LC 214/2025.
 *  - A alíquota de referência da CBS ainda não foi fixada pelo Senado.
 *    Por isso o parâmetro rate_effective da CBS fica ausente de propósito.
 *  - Não cumulatividade plena: em princípio, 100% dos créditos apurados na
 *    cadeia são aproveitáveis (credit_rate = 1) — mas o detalhamento por
 *    categoria de despesa ainda depende de regulamentação complementar.
 */

import type { TaxParameterMap, TaxRegimeCode } from "./types.ts";

export type TaxReform2027Template = {
  regimeCode: TaxRegimeCode;
  versionLabel: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  /** Parâmetros já confirmados — só entram aqui os que têm base legal certa. */
  parameters: TaxParameterMap;
  /** Chaves que o motor exige mas que ainda não têm valor oficial definido. */
  pendingParameters: string[];
  notes: string;
  legalReferences: string[];
};

export const TAX_REFORM_2027_EFFECTIVE_FROM = "2027-01-01";

/**
 * Regras universais: aplicam-se a QUALQUER empresa, independente do regime
 * tributário atual, porque CBS e IBS substituem PIS/Cofins (CBS) e,
 * gradualmente, ICMS/ISS (IBS) — pra todo mundo.
 */
export function buildUniversalTaxReform2027Templates(): TaxReform2027Template[] {
  return [
    {
      regimeCode: "ibs",
      versionLabel: "IBS 2027–2028 — Reforma Tributária",
      effectiveFrom: TAX_REFORM_2027_EFFECTIVE_FROM,
      effectiveTo: "2028-12-31",
      parameters: {
        rate_effective: 0.001, // 0,1% — LC 214/2025, confirmado para 2027-2028
        base_multiplier: 1,
        credit_rate: 1, // não cumulatividade plena (princípio da lei)
      },
      pendingParameters: [],
      notes:
        "Alíquota de 0,1% (0,05% estados + 0,05% municípios) confirmada pela LC 214/2025 " +
        "para 2027 e 2028. Pronta pra ativar — revise antes de marcar como 'active'.",
      legalReferences: ["EC 132/2023", "LC 214/2025, art. sobre alíquotas de teste/transição"],
    },
    {
      regimeCode: "cbs",
      versionLabel: "CBS 2027 — Reforma Tributária (extinção PIS/Cofins)",
      effectiveFrom: TAX_REFORM_2027_EFFECTIVE_FROM,
      effectiveTo: null,
      parameters: {
        base_multiplier: 1,
        credit_rate: 1,
      },
      pendingParameters: ["rate_effective"],
      notes:
        "PIS e Cofins são extintos em 2027 e substituídos pela CBS cobrada em alíquota cheia. " +
        "A alíquota de referência definitiva AINDA NÃO foi fixada pelo Senado Federal — " +
        "por isso rate_effective fica pendente. A lei já determina que a CBS será reduzida " +
        "em 0,1 ponto percentual em 2027 e 2028 (compensando o IBS de 0,1%), mas isso é uma " +
        "correção sobre a alíquota de referência, não a alíquota em si. Preencha " +
        "rate_effective assim que o Senado publicar a resolução, e só então ative esta regra.",
      legalReferences: [
        "EC 132/2023",
        "LC 214/2025 (extinção de PIS/Cofins e criação da CBS)",
      ],
    },
  ];
}

/**
 * Notas específicas por regime tributário (Simples Nacional, Presumido,
 * Real) — não geram uma nova versão de regra própria pra 2027, porque as
 * mecânicas de IRPJ/CSLL desses regimes não mudam; o que muda é a
 * interação deles com CBS/IBS. Guardadas aqui só como texto informativo
 * pra exibir na tela, não como parâmetro de cálculo.
 */
export function describeRegimeSpecificNote2027(
  regimeCode: TaxRegimeCode,
): string | null {
  switch (regimeCode) {
    case "simples_nacional":
      return (
        "Entre janeiro e junho de 2027, empresas do Simples Nacional podem optar por apurar " +
        "IBS e CBS fora do DAS, pelo regime regular (Resolução CGSN nº 186/2026). Essa opção " +
        "não é automática — quem não optar continua com IBS/CBS embutidos no DAS."
      );
    case "lucro_presumido":
    case "lucro_real":
      return (
        "PIS e Cofins deixam de existir em 2027; a apuração de créditos e débitos passa a " +
        "seguir a CBS, com não cumulatividade mais ampla que a atual."
      );
    default:
      return null;
  }
}
