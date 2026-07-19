"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { MaskedInput } from "@/components/clientes/masked-input";
import { CancelButton } from "@/components/ui/cancel-button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { FormField } from "@/components/ui/form-field";
import { FormGrid } from "@/components/ui/form-grid";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { SaveButton } from "@/components/ui/save-button";
import { Textarea } from "@/components/ui/textarea";
import {
  createClienteAction,
  checkClienteDuplicatesAction,
  updateClienteAction,
} from "@/lib/clientes/actions";
import {
  CLIENTE_STATUS_OPTIONS,
  TIPO_PESSOA_OPTIONS,
  UF_OPTIONS,
} from "@/lib/clientes/constants";
import {
  getDataReferenciaLabel,
  getNomeLabel,
} from "@/lib/clientes/format";
import { clienteToFormValues } from "@/lib/clientes/mappers";
import {
  maskCep,
  maskDocumento,
  maskTelefone,
} from "@/lib/clientes/masks";
import {
  clienteFormSchema,
  type ClienteFormValues,
} from "@/lib/clientes/validations";
import type { Cliente } from "@/types/clientes";

type ClienteFormProps = {
  tenantSlug: string;
  mode: "create" | "edit";
  cliente?: Cliente;
};

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function ClienteForm({ tenantSlug, mode, cliente }: ClienteFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteFormSchema),
    defaultValues: cliente
      ? clienteToFormValues(cliente)
      : {
          tipo_pessoa: "pf",
          nome: "",
          razao_social: "",
          documento: "",
          telefone: "",
          whatsapp: "",
          email: "",
          data_referencia: "",
          cep: "",
          rua: "",
          numero: "",
          complemento: "",
          bairro: "",
          cidade: "",
          estado: "",
          segmento: "",
          porte: "",
          origem: "",
          observacoes: "",
          ativo: true,
        },
  });

  const tipoPessoa = useWatch({ control: form.control, name: "tipo_pessoa" });

  async function onSubmit(values: ClienteFormValues) {
    setLoading(true);
    setError(null);

    const dup = await checkClienteDuplicatesAction(tenantSlug, {
      excludeId: cliente?.id,
      documento: values.documento,
      email: values.email,
      telefone: values.telefone,
    });

    if (dup.success && dup.result.hasDuplicates) {
      setError(
        `Possível duplicidade: ${dup.result.matches
          .slice(0, 3)
          .map((m) => `${m.label} (${m.matchedOn.join(", ")})`)
          .join("; ")}. Ajuste antes de salvar.`,
      );
      setLoading(false);
      return;
    }

    const action =
      mode === "create"
        ? createClienteAction(tenantSlug, values)
        : updateClienteAction(tenantSlug, cliente!.id, values);

    const result = await action;

    if (!result.success) {
      console.error(result.error);
      setError(result.error);
      setLoading(false);
      return;
    }

    const success = mode === "create" ? "created" : "updated";
    router.push(
      `/${tenantSlug}/clientes/${result.id}?success=${success}`,
    );
  }

  function handleCancel() {
    router.push(
      mode === "edit" && cliente
        ? `/${tenantSlug}/clientes/${cliente.id}`
        : `/${tenantSlug}/clientes`,
    );
  }

  return (
    <div className="relative">
      <LoadingOverlay loading={loading} label="Salvando..." />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}

        <FormSection
          title="Identificação"
          description="Dados principais do cliente ou empresa."
        >
          <FormGrid>
            <FormField label="Tipo de pessoa" htmlFor="tipo_pessoa" required>
              <select
                id="tipo_pessoa"
                {...form.register("tipo_pessoa")}
                className={selectClassName}
              >
                {TIPO_PESSOA_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Status" htmlFor="ativo" required>
              <Controller
                control={form.control}
                name="ativo"
                render={({ field }) => (
                  <select
                    id="ativo"
                    value={String(field.value)}
                    onChange={(event) =>
                      field.onChange(event.target.value === "true")
                    }
                    className={selectClassName}
                  >
                    {CLIENTE_STATUS_OPTIONS.map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              />
            </FormField>

            <FormField
              label={getNomeLabel(tipoPessoa)}
              htmlFor="nome"
              required
              error={form.formState.errors.nome?.message}
              className="md:col-span-2"
            >
              <Input
                id="nome"
                {...form.register("nome")}
                placeholder={
                  tipoPessoa === "pf" ? "Nome completo" : "Razão social / nome"
                }
              />
            </FormField>

            {tipoPessoa === "pj" ? (
              <FormField
                label="Razão social (complementar)"
                htmlFor="razao_social"
                className="md:col-span-2"
              >
                <Input
                  id="razao_social"
                  {...form.register("razao_social")}
                  placeholder="Se diferente do nome fantasia usado acima"
                />
              </FormField>
            ) : null}

            <FormField label="Segmento" htmlFor="segmento">
              <Input id="segmento" {...form.register("segmento")} />
            </FormField>

            <FormField label="Porte" htmlFor="porte">
              <Input
                id="porte"
                {...form.register("porte")}
                placeholder="MEI, pequeno, médio…"
              />
            </FormField>

            <FormField label="Origem" htmlFor="origem">
              <Input
                id="origem"
                {...form.register("origem")}
                placeholder="Indicação, Google, franquia…"
              />
            </FormField>

            <FormField
              label={tipoPessoa === "pf" ? "CPF" : "CNPJ"}
              htmlFor="documento"
              error={form.formState.errors.documento?.message}
            >
              <Controller
                control={form.control}
                name="documento"
                render={({ field }) => (
                  <MaskedInput
                    id="documento"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    mask={(value) => maskDocumento(value, tipoPessoa)}
                    placeholder={
                      tipoPessoa === "pf"
                        ? "000.000.000-00"
                        : "00.000.000/0000-00"
                    }
                  />
                )}
              />
            </FormField>

            <FormField
              label={getDataReferenciaLabel(tipoPessoa)}
              htmlFor="data_referencia"
            >
              <Input id="data_referencia" type="date" {...form.register("data_referencia")} />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection
          title="Contato"
          description="Canais de comunicação com o cliente."
        >
          <FormGrid>
            <FormField label="Telefone" htmlFor="telefone">
              <Controller
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <MaskedInput
                    id="telefone"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    mask={maskTelefone}
                    placeholder="(00) 00000-0000"
                  />
                )}
              />
            </FormField>

            <FormField label="WhatsApp" htmlFor="whatsapp">
              <Controller
                control={form.control}
                name="whatsapp"
                render={({ field }) => (
                  <MaskedInput
                    id="whatsapp"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    mask={maskTelefone}
                    placeholder="(00) 00000-0000"
                  />
                )}
              />
            </FormField>

            <FormField
              label="E-mail"
              htmlFor="email"
              error={form.formState.errors.email?.message}
              className="md:col-span-2"
            >
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                placeholder="cliente@email.com"
              />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection
          title="Endereço"
          description="Localização e dados para entrega ou faturamento."
        >
          <FormGrid>
            <FormField
              label="CEP"
              htmlFor="cep"
              error={form.formState.errors.cep?.message}
            >
              <Controller
                control={form.control}
                name="cep"
                render={({ field }) => (
                  <MaskedInput
                    id="cep"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    mask={maskCep}
                    placeholder="00000-000"
                  />
                )}
              />
            </FormField>

            <FormField label="Rua" htmlFor="rua" className="md:col-span-2">
              <Input id="rua" {...form.register("rua")} placeholder="Logradouro" />
            </FormField>

            <FormField label="Número" htmlFor="numero">
              <Input id="numero" {...form.register("numero")} placeholder="123" />
            </FormField>

            <FormField label="Complemento" htmlFor="complemento">
              <Input
                id="complemento"
                {...form.register("complemento")}
                placeholder="Apto, sala, bloco"
              />
            </FormField>

            <FormField label="Bairro" htmlFor="bairro">
              <Input id="bairro" {...form.register("bairro")} />
            </FormField>

            <FormField label="Cidade" htmlFor="cidade">
              <Input id="cidade" {...form.register("cidade")} />
            </FormField>

            <FormField
              label="Estado"
              htmlFor="estado"
              error={form.formState.errors.estado?.message}
            >
              <select
                id="estado"
                {...form.register("estado")}
                className={selectClassName}
              >
                <option value="">Selecione</option>
                {UF_OPTIONS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection title="Observações">
          <FormField label="Anotações internas" htmlFor="observacoes">
            <Textarea
              id="observacoes"
              rows={4}
              {...form.register("observacoes")}
              placeholder="Informações adicionais sobre o cliente"
            />
          </FormField>
        </FormSection>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <CancelButton onClick={handleCancel} disabled={loading} />
          <SaveButton loading={loading}>
            {mode === "create" ? "Cadastrar cliente" : "Salvar alterações"}
          </SaveButton>
        </div>
      </form>
    </div>
  );
}
