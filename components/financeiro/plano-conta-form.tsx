"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { DreClassificationSelect } from "@/components/financeiro/dre-classification-select";
import { PlanoContaSelect } from "@/components/financeiro/plano-conta-select";
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
  createPlanoContaAction,
  updatePlanoContaAction,
} from "@/lib/financeiro/actions";
import {
  FINANCEIRO_STATUS_OPTIONS,
  PLANO_CONTA_TIPO_OPTIONS,
  PLANO_CONTA_NATUREZA_OPTIONS,
} from "@/lib/financeiro/constants";
import { planoContaToFormValues } from "@/lib/financeiro/mappers";
import {
  planoContaFormSchema,
  type PlanoContaFormInput,
  type PlanoContaFormValues,
} from "@/lib/financeiro/validations";
import type { PlanoConta, PlanoContaSelectOption } from "@/types/financeiro";

type Props = {
  tenantSlug: string;
  mode: "create" | "edit";
  item?: PlanoConta;
  parentOptions: PlanoContaSelectOption[];
};

const selectClassName = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function PlanoContaForm({
  tenantSlug,
  mode,
  item,
  parentOptions,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<PlanoContaFormInput, unknown, PlanoContaFormValues>({
    resolver: zodResolver(planoContaFormSchema),
    defaultValues: item ? planoContaToFormValues(item) : {
          codigo: "",
          nome: "",
          tipo: "receita",
          natureza: "analitica",
          conta_pai_id: "",
          aceita_lancamento: true,
          ordem: 0,
          observacoes: "",
          dre_linha: "",
          dre_detalhe: "",
          ativo: true,
        },
  });

  async function onSubmit(values: PlanoContaFormValues) {
    setLoading(true);
    setError(null);

    const result =
      mode === "create"
        ? await createPlanoContaAction(tenantSlug, values)
        : await updatePlanoContaAction(tenantSlug, item!.id, values);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const success = mode === "create" ? "created" : "updated";
    router.push(
      `/${tenantSlug}/financeiro/plano-contas/${result.id}?success=${success}`,
    );
  }

  function handleCancel() {
    router.push(
      mode === "edit" && item
        ? `/${tenantSlug}/financeiro/plano-contas/${item.id}`
        : `/${tenantSlug}/financeiro/plano-contas`,
    );
  }

  return (
    <div className="relative">
      <LoadingOverlay loading={loading} label="Salvando..." />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}

        <FormSection title="Identificação" description="Código, nome e classificação da conta.">
          <FormGrid>
            <FormField label="Código" htmlFor="codigo" required error={form.formState.errors.codigo?.message}>
              <Input id="codigo" {...form.register("codigo")} placeholder="1.1.01" />
            </FormField>
            <FormField label="Nome" htmlFor="nome" required error={form.formState.errors.nome?.message}>
              <Input id="nome" {...form.register("nome")} placeholder="Receitas operacionais" />
            </FormField>
            <FormField label="Tipo" htmlFor="tipo" required>
              <select id="tipo" {...form.register("tipo")} className={selectClassName}>
                {PLANO_CONTA_TIPO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Natureza" htmlFor="natureza" required>
              <select id="natureza" {...form.register("natureza")} className={selectClassName}>
                {PLANO_CONTA_NATUREZA_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </FormField>
            <PlanoContaSelect
              control={form.control}
              name="conta_pai_id"
              options={parentOptions}
              error={form.formState.errors.conta_pai_id?.message}
              onlySinteticaHint
            />
            <FormField label="Ordem" htmlFor="ordem">
              <Input id="ordem" type="number" {...form.register("ordem", { setValueAs: (v) => (v === "" || v == null ? 0 : Number(v)) })} />
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
            <FormField label="Aceita lançamento" htmlFor="aceita_lancamento">
              <Controller control={form.control} name="aceita_lancamento" render={({ field }) => (
                <select id="aceita_lancamento" value={String(field.value)} onChange={(event) => field.onChange(event.target.value === "true")} className={selectClassName}>
                  <option value="true">Sim</option>
                  <option value="false">Não</option>
                </select>
              )} />
            </FormField>
            <DreClassificationSelect
              register={form.register}
              setValue={form.setValue}
              watch={form.watch}
            />
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
