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
  createFormaPagamentoAction,
  updateFormaPagamentoAction,
} from "@/lib/financeiro/actions";
import {
  FINANCEIRO_STATUS_OPTIONS,
  FORMA_PAGAMENTO_TIPO_OPTIONS,
} from "@/lib/financeiro/constants";
import { formaPagamentoToFormValues } from "@/lib/financeiro/mappers";
import {
  formaPagamentoFormSchema,
  type FormaPagamentoFormInput,
  type FormaPagamentoFormValues,
} from "@/lib/financeiro/validations";
import type { FormaPagamento } from "@/types/financeiro";

type Props = {
  tenantSlug: string;
  mode: "create" | "edit";
  item?: FormaPagamento;
};

const selectClassName = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function FormaPagamentoForm({ tenantSlug, mode, item }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormaPagamentoFormInput, unknown, FormaPagamentoFormValues>({
    resolver: zodResolver(formaPagamentoFormSchema),
    defaultValues: item ? formaPagamentoToFormValues(item) : {
          nome: "",
          tipo: "pix",
          gera_financeiro: true,
          dias_compensacao: 0,
          taxa_percent: null,
          observacoes: "",
          ativo: true,
        },
  });

  async function onSubmit(values: FormaPagamentoFormValues) {
    setLoading(true);
    setError(null);

    const result =
      mode === "create"
        ? await createFormaPagamentoAction(tenantSlug, values)
        : await updateFormaPagamentoAction(tenantSlug, item!.id, values);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const success = mode === "create" ? "created" : "updated";
    router.push(
      `/${tenantSlug}/financeiro/formas-pagamento/${result.id}?success=${success}`,
    );
  }

  function handleCancel() {
    router.push(
      mode === "edit" && item
        ? `/${tenantSlug}/financeiro/formas-pagamento/${item.id}`
        : `/${tenantSlug}/financeiro/formas-pagamento`,
    );
  }

  return (
    <div className="relative">
      <LoadingOverlay loading={loading} label="Salvando..." />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}

        <FormSection title="Forma de pagamento" description="Canal de liquidação e parâmetros.">
          <FormGrid>
            <FormField label="Nome" htmlFor="nome" required error={form.formState.errors.nome?.message} className="md:col-span-2">
              <Input id="nome" {...form.register("nome")} placeholder="PIX" />
            </FormField>
            <FormField label="Tipo" htmlFor="tipo" required>
              <select id="tipo" {...form.register("tipo")} className={selectClassName}>
                {FORMA_PAGAMENTO_TIPO_OPTIONS.map((option) => (
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
            <FormField label="Gera financeiro" htmlFor="gera_financeiro">
              <Controller control={form.control} name="gera_financeiro" render={({ field }) => (
                <select id="gera_financeiro" value={String(field.value)} onChange={(event) => field.onChange(event.target.value === "true")} className={selectClassName}>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              )} />
            </FormField>
            <FormField label="Dias de compensação" htmlFor="dias_compensacao" error={form.formState.errors.dias_compensacao?.message}>
              <Input id="dias_compensacao" type="number" {...form.register("dias_compensacao", { setValueAs: (v) => (v === "" || v == null ? 0 : Number(v)) })} />
            </FormField>
            <FormField label="Taxa (%)" htmlFor="taxa_percent" error={form.formState.errors.taxa_percent?.message}>
              <Input id="taxa_percent" type="number" step="0.0001" {...form.register("taxa_percent", { setValueAs: (v) => (v === "" || v == null ? null : Number(v)) })} />
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
