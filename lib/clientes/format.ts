import {
  maskCep,
  maskDocumento,
  maskTelefone,
  onlyDigits,
} from "@/lib/clientes/masks";
import type { TipoPessoa } from "@/types/clientes";

export { onlyDigits };

export function formatDocumento(
  documento: string | null | undefined,
  tipoPessoa: TipoPessoa,
) {
  if (!documento) return "—";
  return maskDocumento(documento, tipoPessoa);
}

export function formatTelefone(telefone: string | null | undefined) {
  if (!telefone) return "—";
  return maskTelefone(telefone);
}

export function formatCep(cep: string | null | undefined) {
  if (!cep) return "—";
  return maskCep(cep);
}

export function formatDataReferencia(date: string | null | undefined) {
  if (!date) return "—";

  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(
    new Date(`${date}T00:00:00`),
  );
}

export function getDataReferenciaLabel(tipoPessoa: TipoPessoa) {
  return tipoPessoa === "pf" ? "Data de nascimento" : "Data de abertura";
}

export function getNomeLabel(tipoPessoa: TipoPessoa) {
  return tipoPessoa === "pf" ? "Nome completo" : "Razão social";
}

export function formatClienteDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
}

export function formatEndereco(cliente: {
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
}) {
  const parts = [
    [cliente.rua, cliente.numero].filter(Boolean).join(", "),
    cliente.complemento,
    cliente.bairro,
    [cliente.cidade, cliente.estado].filter(Boolean).join(" - "),
    cliente.cep ? formatCep(cliente.cep) : null,
  ].filter(Boolean);

  return parts.length ? parts.join(" · ") : "—";
}

export function toInputDate(value: string | null | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function toFormMaskValue(
  value: string | null | undefined,
  mask: (input: string) => string,
) {
  if (!value) return "";
  return mask(value);
}
