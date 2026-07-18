export type DreLancamentoOrigem = "conta-receber" | "conta-pagar";

export type DreClassificacaoIncompleta = {
  id: string;
  numero: number;
  descricao: string;
  origem: DreLancamentoOrigem;
  data_competencia: string;
  campos_faltantes: string[];
};
