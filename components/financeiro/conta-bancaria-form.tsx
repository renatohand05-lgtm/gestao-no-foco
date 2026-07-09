"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

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
  createContaBancariaAction,
  updateContaBancariaAction,
} from "@/lib/financeiro/actions";
import {
  FINANCEIRO_STATUS_OPTIONS,
  CONTA_BANCARIA_TIPO_OPTIONS,
} from "@/lib/financeiro/constants";
import { contaBancariaToFormValues } from "@/lib/financeiro/mappers";
import {
  contaBancariaFormSchema,
  type ContaBancariaFormInput,
  type ContaBancariaFormValues,
} from "@/lib/financeiro/validations";
import type { ContaBancaria } from "@/types/financeiro";

type Props = {
  tenantSlug: string;
  mode: "create" | "edit";
  item?: ContaBancaria;
};

const selectClassName = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function ContaBancariaForm({ tenantSlug, mode, item }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<ContaBancariaFormInput, unknown, ContaBancariaFormValues>({
    resolver: zodResolver(contaBancariaFormSchema),
    defaultValues: item ? contaBancariaToFormValues(item) : {
          nome: "",
          tipo: "corrente",
          banco: "",
          agencia: "",
          conta: "",
          titular: "",
          saldo_inicial: 0,
          observacoes: "",
          ativo: true,
        },
  });

  async function onSubmit(values: ContaBancariaFormValues) {
    setLoading(true);
    setError(null);

    const result =
      mode === "create"
        ? await createContaBancariaAction(tenantSlug, values)
        : await updateContaBancariaAction(tenantSlug, item!.id, values);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const success = mode === "create" ? "created" : "updated";
    router.push(
      `/${tenantSlug}/financeiro/contas-bancarias/${result.id}?success=${success}`,
    );
  }

  function handleCancel() {
    router.push(
      mode === "edit" && item
        ? `/${tenantSlug}/financeiro/contas-bancarias/${item.id}`
        : `/${tenantSlug}/financeiro/contas-bancarias`,
    );
  }

  return (
    <div className="relative">
      <LoadingOverlay loading={loading} label="Salvando..." />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}

        <FormSection title="Conta" description="Dados bancários e saldo inicial.">
          <FormGrid>
            <FormField label="Nome" htmlFor="nome" required error={form.formState.errors.nome?.message} className="md:col-span-2">
              <Input id="nome" {...form.register("nome")} placeholder="Conta principal" />
            </FormField>
            <FormField label="Tipo" htmlFor="tipo" required>
              <select id="tipo" {...form.register("tipo")} className={selectClassName}>
                {CONTA_BANCARIA_TIPO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Status" htmlFor="ativo" required>
              <Controller control={form.control} name="ativo" render={({ field }) => (
                <select id="ativo" value={String(field.value)} onChange={(event) => field.onChange(event.target.value === "true")} className={selectClassName}>
                  {FINANCEIRO_STATUS_OPTIONS.map((option) => (
                    <option key={String(option.value)} value={String(option.value)}>{option.label}</option>
                  ))}
                </select>
              )} />
            </FormField>
            <FormField label="Banco" htmlFor="banco">
              <Input id="banco" {...form.register("banco")} />
            </FormField>
            <FormField label="Agência" htmlFor="agencia">
              <Input id="agencia" {...form.register("agencia")} />
            </FormField>
            <FormField label="Conta" htmlFor="conta">
              <Input id="conta" {...form.register("conta")} />
            </FormField>
            <FormField label="Titular" htmlFor="titular">
              <Input id="titular" {...form.register("titular")} />
            </FormField>
            <FormField label="Saldo inicial" htmlFor="saldo_inicial" error={form.formState.errors.saldo_inicial?.message}>
              <Input id="saldo_inicial" type="number" step="0.01" {...form.register("saldo_inicial", { setValueAs: (v) => (v === "" || v == null ? 0 : Number(v)) })} />
            </FormField>
            <FormField label="Observações" htmlFor="observacoes" className="md:col-span-2">
              <Textarea id="observacoes" {...form.register("observacoes")} rows={3} />
            </FormField>
          </FormGrid>
        </FormSection>
        <div className="flex items-center justify-end gap-3">
          <CancelButton type="button" onClick={handleCancel} />
          <SaveButton type="submit" loading={loading} />
        </div>
      </form>
    </div>
  );
}
