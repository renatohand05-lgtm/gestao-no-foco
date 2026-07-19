/** Tipos — Importação NF-e de entrada (Sprint 13.22). */

export const NFE_STATUS = [
  "rascunho",
  "aguardando_conferencia",
  "validada",
  "processando",
  "importada",
  "erro",
  "cancelada",
] as const;

export type NfeStatus = (typeof NFE_STATUS)[number];

export const NFE_DESTINOS = [
  "pendente",
  "estoque",
  "os",
  "misto",
  "despesa",
  "ignorar",
] as const;

export type NfeDestino = (typeof NFE_DESTINOS)[number];

export const NFE_VINCULO_STATUS = [
  "pendente",
  "sugerido",
  "vinculado",
  "criado",
  "despesa",
  "ignorado",
] as const;

export type NfeVinculoStatus = (typeof NFE_VINCULO_STATUS)[number];

export type NfeDuplicata = {
  numero: string | null;
  vencimento: string | null;
  valor: number;
};

export type NfeEmitenteEndereco = {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
  cep?: string | null;
};

export type NfeEntradaListItem = {
  id: string;
  chave_acesso: string;
  numero: string | null;
  serie: string | null;
  data_emissao: string | null;
  status: NfeStatus;
  valor_total: number;
  emitente_razao_social: string | null;
  emitente_cnpj_cpf: string | null;
  fornecedor_id: string | null;
  created_at: string;
};

export type NfeEntradaItem = {
  id: string;
  nota_fiscal_id: string;
  numero_item: number;
  codigo_fornecedor: string | null;
  ean: string | null;
  descricao_original: string;
  produto_id: string | null;
  produto_nome?: string | null;
  ncm: string | null;
  cest: string | null;
  cfop: string | null;
  unidade: string | null;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  valor_desconto: number;
  valor_frete_rateado: number;
  valor_outras_despesas_rateado: number;
  valor_impostos: number;
  custo_unitario_final: number;
  custo_total_final: number;
  lote: string | null;
  destino: NfeDestino;
  quantidade_estoque: number;
  quantidade_os: number;
  ordem_servico_id: string | null;
  ordem_servico_item_id: string | null;
  estoque_movimentacao_id: string | null;
  status_vinculo: NfeVinculoStatus;
  motivo_ignorar: string | null;
  custo_produto_atual?: number | null;
};

export type NfeEntradaEvento = {
  id: string;
  tipo: string;
  descricao: string;
  resultado: string | null;
  referencia_tipo: string | null;
  referencia_id: string | null;
  user_id: string | null;
  created_at: string;
};

export type NfeEntradaDetail = NfeEntradaListItem & {
  modelo: string | null;
  data_entrada: string | null;
  natureza_operacao: string | null;
  emitente_nome_fantasia: string | null;
  emitente_ie: string | null;
  emitente_endereco: NfeEmitenteEndereco;
  valor_produtos: number;
  valor_frete: number;
  valor_seguro: number;
  valor_desconto: number;
  valor_outras_despesas: number;
  valor_impostos: number;
  forma_pagamento: string | null;
  duplicatas: NfeDuplicata[];
  informacoes_complementares: string | null;
  protocolo_autorizacao: string | null;
  gerar_conta_pagar: boolean;
  conta_pagar_id: string | null;
  categoria_financeira_id: string | null;
  plano_conta_id: string | null;
  centro_custo_id: string | null;
  observacoes: string | null;
  erro_mensagem: string | null;
  xml_hash: string;
  storage_path: string | null;
  processado_em: string | null;
  updated_at: string;
  itens: NfeEntradaItem[];
  eventos: NfeEntradaEvento[];
};

export type ParsedNfeItem = {
  numero_item: number;
  codigo_fornecedor: string | null;
  ean: string | null;
  descricao: string;
  ncm: string | null;
  cest: string | null;
  cfop: string | null;
  unidade: string | null;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  valor_desconto: number;
  lote: string | null;
};

export type ParsedNfe = {
  chave_acesso: string;
  numero: string | null;
  serie: string | null;
  modelo: string | null;
  data_emissao: string | null;
  natureza_operacao: string | null;
  emitente: {
    cnpj_cpf: string | null;
    razao_social: string | null;
    nome_fantasia: string | null;
    ie: string | null;
    endereco: NfeEmitenteEndereco;
  };
  totais: {
    valor_produtos: number;
    valor_frete: number;
    valor_seguro: number;
    valor_desconto: number;
    valor_outras_despesas: number;
    valor_impostos: number;
    valor_total: number;
  };
  forma_pagamento: string | null;
  duplicatas: NfeDuplicata[];
  informacoes_complementares: string | null;
  protocolo_autorizacao: string | null;
  itens: ParsedNfeItem[];
};

export type ProductMatchSuggestion = {
  produto_id: string;
  nome: string;
  score: number;
  reason: "ean" | "vinculo" | "sku" | "codigo_interno" | "descricao";
};
