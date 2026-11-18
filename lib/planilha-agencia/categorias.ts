/**
 * Decide em qual linha da DRE do portal cada conta da planilha entra (receita bruta, deduções,
 * pessoal, comercial, operacional…). Regras simples por nome; o usuário pode ajustar depois em
 * Financeiro → Categorias. Sem acesso ao banco.
 */
import { sem } from "./texto.ts";
import type { TipoLancamento } from "./tipos.ts";

export type ClassificacaoDre = {
  /** `null` = fica "pendente" e fora do resultado (ex.: distribuição de lucros aos sócios). */
  dre_linha: string | null;
  dre_detalhe: string | null;
  origem: "sugestao_nome" | "lote" | null;
  /** Texto curto para mostrar ao usuário. */
  motivo: string;
};

export type SugestaoPorNome = (nome: string) => { linha: string; detalhe: string | null } | null;

const RE_DISTRIBUICAO =
  /(distribuicao de lucro|distribuicao dos lucros|dividendo|retirada de lucro|lucros? (aos|dos) socios)/;
const RE_IMPOSTO = /\b(imposto|impostos|tributo|tributos|simples nacional|iss|das|pis|cofins|inss)\b/;
const RE_PESSOAL =
  /(folha|salario|salarios|\bclt\b|equipe|\bcs\b|\bsdr\b|designer|\bdesign\b|gestor|gestao|atendente|atendimento ao cliente|comiss|bonus|13o|ferias|encargo|beneficio|pro labore|prolabore|colaborador|funcionario|freelancer)/;
const RE_BONUS = /(comiss|bonus)/;
const RE_PROLABORE = /(pro labore|prolabore)/;
const RE_MARKETING = /(trafego|anuncio|\bads\b|marketing|publicidade|midia paga|meta ads|google ads)/;
const RE_FINANCEIRA = /(juros|rendimento|aplicacao financeira|rendimentos)/;

export function classificarCategoria(
  nome: string,
  tipo: TipoLancamento,
  sugerir: SugestaoPorNome,
): ClassificacaoDre {
  const s = sem(nome);

  if (tipo === "receita") {
    if (RE_FINANCEIRA.test(s)) {
      return {
        dre_linha: "receitas_financeiras",
        dre_detalhe: null,
        origem: "sugestao_nome",
        motivo: "Receita financeira",
      };
    }
    return { dre_linha: "receita_bruta", dre_detalhe: null, origem: "lote", motivo: "Receita bruta" };
  }

  if (RE_DISTRIBUICAO.test(s)) {
    return {
      dre_linha: null,
      dre_detalhe: null,
      origem: null,
      motivo: "Distribuição de lucros: fica fora do resultado da empresa",
    };
  }
  if (RE_IMPOSTO.test(s)) {
    return { dre_linha: "deducoes", dre_detalhe: null, origem: "sugestao_nome", motivo: "Impostos sobre a venda (dedução)" };
  }
  if (RE_PESSOAL.test(s)) {
    const detalhe = RE_PROLABORE.test(s) ? "pessoal_prolabore" : RE_BONUS.test(s) ? "pessoal_bonus" : "pessoal_salarios";
    return { dre_linha: "despesas_pessoal", dre_detalhe: detalhe, origem: "sugestao_nome", motivo: "Despesa com pessoal" };
  }
  if (RE_MARKETING.test(s)) {
    const detalhe = /(marketing|publicidade)/.test(s) ? "comercial_marketing" : "comercial_anuncios";
    return { dre_linha: "despesas_comerciais", dre_detalhe: detalhe, origem: "sugestao_nome", motivo: "Despesa comercial / marketing" };
  }

  const sug = sugerir(nome);
  if (sug && sug.linha !== "receita_bruta" && sug.linha !== "receitas_financeiras") {
    return {
      dre_linha: sug.linha,
      dre_detalhe: sug.detalhe,
      origem: "sugestao_nome",
      motivo: "Sugerido pelo nome da conta",
    };
  }
  return {
    dre_linha: "despesas_operacionais",
    dre_detalhe: "opex_outras",
    origem: "lote",
    motivo: "Despesa operacional (padrão)",
  };
}
