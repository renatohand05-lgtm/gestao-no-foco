import {
  maskCep,
  maskDocumento,
  maskTelefone,
  onlyDigits,
} from "@/lib/clientes/masks";
import type { CrmFunilStage } from "@/lib/crm/constants";
import type { ClienteFormValues } from "@/lib/clientes/validations";
import type { Cliente, CreateClienteInput } from "@/types/clientes";
import { toFormMaskValue, toInputDate } from "@/lib/clientes/format";

export function normalizeClienteFormValues(
  values: ClienteFormValues,
): CreateClienteInput {
  const documento = onlyDigits(values.documento ?? "");
  const telefone = onlyDigits(values.telefone ?? "");
  const whatsapp = onlyDigits(values.whatsapp ?? "");
  const cep = onlyDigits(values.cep ?? "");

  return {
    nome: values.nome.trim(),
    razao_social: values.razao_social?.trim() || null,
    tipo_pessoa: values.tipo_pessoa,
    documento: documento || null,
    telefone: telefone || null,
    whatsapp: whatsapp || null,
    email: values.email?.trim() || null,
    data_referencia: values.data_referencia?.trim() || null,
    cep: cep || null,
    rua: values.rua?.trim() || null,
    numero: values.numero?.trim() || null,
    complemento: values.complemento?.trim() || null,
    bairro: values.bairro?.trim() || null,
    cidade: values.cidade?.trim() || null,
    estado: values.estado?.trim().toUpperCase() || null,
    segmento: values.segmento?.trim() || null,
    porte: values.porte?.trim() || null,
    origem: values.origem?.trim() || null,
    observacoes: values.observacoes?.trim() || null,
    classificacao: values.classificacao?.trim() || null,
    score: values.score ?? 0,
    consultor_id: values.consultor_id?.trim() || null,
    estagio_funil: values.estagio_funil as CrmFunilStage,
    tag_ids: values.tag_ids ?? [],
    ativo: values.ativo,
  };
}

export function clienteToFormValues(cliente: Cliente): ClienteFormValues {
  return {
    tipo_pessoa: cliente.tipo_pessoa,
    nome: cliente.nome,
    razao_social: cliente.razao_social ?? "",
    documento: toFormMaskValue(cliente.documento, (value) =>
      maskDocumento(value, cliente.tipo_pessoa),
    ),
    telefone: toFormMaskValue(cliente.telefone, maskTelefone),
    whatsapp: toFormMaskValue(cliente.whatsapp, maskTelefone),
    email: cliente.email ?? "",
    data_referencia: toInputDate(cliente.data_referencia),
    cep: toFormMaskValue(cliente.cep, maskCep),
    rua: cliente.rua ?? "",
    numero: cliente.numero ?? "",
    complemento: cliente.complemento ?? "",
    bairro: cliente.bairro ?? "",
    cidade: cliente.cidade ?? "",
    estado: cliente.estado ?? "",
    segmento: cliente.segmento ?? "",
    porte: cliente.porte ?? "",
    origem: cliente.origem ?? "",
    observacoes: cliente.observacoes ?? "",
    classificacao: cliente.classificacao ?? "",
    score: Number(cliente.score ?? 0),
    consultor_id: cliente.consultor_id ?? "",
    estagio_funil: (cliente.estagio_funil ?? "lead") as CrmFunilStage,
    tag_ids: [],
    ativo: cliente.ativo,
  };
}

export function buildClientePayload(input: CreateClienteInput) {
  return {
    nome: input.nome,
    razao_social: input.razao_social ?? null,
    tipo_pessoa: input.tipo_pessoa,
    documento: input.documento ?? null,
    telefone: input.telefone ?? null,
    whatsapp: input.whatsapp ?? null,
    email: input.email ?? null,
    data_referencia: input.data_referencia ?? null,
    cep: input.cep ?? null,
    rua: input.rua ?? null,
    numero: input.numero ?? null,
    complemento: input.complemento ?? null,
    bairro: input.bairro ?? null,
    cidade: input.cidade ?? null,
    estado: input.estado ?? null,
    segmento: input.segmento ?? null,
    porte: input.porte ?? null,
    origem: input.origem ?? null,
    observacoes: input.observacoes ?? null,
    classificacao: input.classificacao ?? null,
    score: input.score ?? 0,
    consultor_id: input.consultor_id ?? null,
    estagio_funil: input.estagio_funil ?? "lead",
    ativo: input.ativo,
  };
}
