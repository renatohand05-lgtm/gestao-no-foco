import { z } from "zod";

import { onlyDigits } from "@/lib/clientes/masks";
import { UF_OPTIONS } from "@/lib/clientes/constants";

function isValidCpf(cpf: string) {
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += Number(cpf[i]) * (10 - i);
  let digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  if (digit !== Number(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i += 1) sum += Number(cpf[i]) * (11 - i);
  digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;

  return digit === Number(cpf[10]);
}

function isValidCnpj(cnpj: string) {
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;

  const calc = (length: number) => {
    const weights =
      length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce(
      (acc, weight, index) => acc + Number(cnpj[index]) * weight,
      0,
    );
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
}

const optionalText = z.string().trim().optional().or(z.literal(""));

const optionalEmail = z
  .string()
  .trim()
  .email("Informe um e-mail válido.")
  .optional()
  .or(z.literal(""));

export const clienteFormSchema = z
  .object({
    tipo_pessoa: z.enum(["pf", "pj"]),
    nome: z.string().trim().min(2, "Informe o nome ou razão social."),
    documento: optionalText,
    telefone: optionalText,
    whatsapp: optionalText,
    email: optionalEmail,
    data_referencia: optionalText,
    cep: optionalText,
    rua: optionalText,
    numero: optionalText,
    complemento: optionalText,
    bairro: optionalText,
    cidade: optionalText,
    estado: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine(
        (value) => !value || UF_OPTIONS.includes(value as (typeof UF_OPTIONS)[number]),
        "Informe um estado válido (UF).",
      ),
    observacoes: optionalText,
    ativo: z.boolean(),
  })
  .superRefine((data, ctx) => {
    const documento = onlyDigits(data.documento ?? "");

    if (!documento) return;

    if (data.tipo_pessoa === "pf" && !isValidCpf(documento)) {
      ctx.addIssue({
        code: "custom",
        message: "CPF inválido.",
        path: ["documento"],
      });
    }

    if (data.tipo_pessoa === "pj" && !isValidCnpj(documento)) {
      ctx.addIssue({
        code: "custom",
        message: "CNPJ inválido.",
        path: ["documento"],
      });
    }

    const cep = onlyDigits(data.cep ?? "");
    if (cep && cep.length !== 8) {
      ctx.addIssue({
        code: "custom",
        message: "CEP inválido.",
        path: ["cep"],
      });
    }
  });

export type ClienteFormValues = z.infer<typeof clienteFormSchema>;
