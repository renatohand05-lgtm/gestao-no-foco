import {
  maskCep,
  maskDocumento,
  maskTelefone,
  onlyDigits,
} from "@/lib/clientes/masks";
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
    observacoes: values.observacoes?.trim() || null,
    ativo: values.ativo,
  };
}

export function clienteToFormValues(cliente: Cliente): ClienteFormValues {
  return {
    tipo_pessoa: cliente.tipo_pessoa,
    nome: cliente.nome,
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
    observacoes: cliente.observacoes ?? "",
    ativo: cliente.ativo,
  };
}

export function buildClientePayload(input: CreateClienteInput) {
  return {
    nome: input.nome,
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
    observacoes: input.observacoes ?? null,
    ativo: input.ativo,
  };
}
