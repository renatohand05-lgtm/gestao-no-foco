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
  createCategoriaFinanceiraAction,
  updateCategoriaFinanceiraAction,
} from "@/lib/financeiro/actions";
import {
  FINANCEIRO_STATUS_OPTIONS,
  CATEGORIA_FINANCEIRA_TIPO_OPTIONS,
} from "@/lib/financeiro/constants";
import { categoriaFinanceiraToFormValues } from "@/lib/financeiro/mappers";
import {
  categoriaFinanceiraFormSchema,
  type CategoriaFinanceiraFormInput,
  type CategoriaFinanceiraFormValues,
} from "@/lib/financeiro/validations";
import type { CategoriaFinanceira, PlanoContaSelectOption } from "@/types/financeiro";

type Props = {
  tenantSlug: string;
  mode: "create" | "edit";
  item?: CategoriaFinanceira;
  planoContaOptions: PlanoContaSelectOption[];
};

const selectClassName = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function CategoriaFinanceiraForm({
  tenantSlug,
  mode,
  item,
  planoContaOptions,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<CategoriaFinanceiraFormInput, unknown, CategoriaFinanceiraFormValues>({
    resolver: zodResolver(categoriaFinanceiraFormSchema),
    defaultValues: item ? categoriaFinanceiraToFormValues(item) : {
          nome: "",
          tipo: "receita",
          plano_conta_id: "",
          dre_linha: "",
          dre_detalhe: "",
          cor: "",
          observacoes: "",
          ativo: true,
        },
  });

  async function onSubmit(values: CategoriaFinanceiraFormValues) {
    setLoading(true);
    setError(null);

    const result =
      mode === "create"
        ? await createCategoriaFinanceiraAction(tenantSlug, values)
        : await updateCategoriaFinanceiraAction(tenantSlug, item!.id, values);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const success = mode === "create" ? "created" : "updated";
    router.push(
      `/${tenantSlug}/financeiro/categorias/${result.id}?success=${success}`,
    );
  }

  function handleCancel() {
    router.push(
      mode === "edit" && item
        ? `/${tenantSlug}/financeiro/categorias/${item.id}`
        : `/${tenantSlug}/financeiro/categorias`,
    );
  }

  return (
    <div className="relative">
      <LoadingOverlay loading={loading} label="Salvando..." />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}

        <FormSection title="Categoria" description="Classificação gerencial vinculada opcionalmente ao plano.">
          <FormGrid>
            <FormField label="Nome" htmlFor="nome" required error={form.formState.errors.nome?.message} className="md:col-span-2">
              <Input id="nome" {...form.register("nome")} placeholder="Serviços" />
            </FormField>
            <FormField label="Tipo" htmlFor="tipo" required>
              <select id="tipo" {...form.register("tipo")} className={selectClassName}>
                {CATEGORIA_FINANCEIRA_TIPO_OPTIONS.map((option) => (
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
            <PlanoContaSelect
              control={form.control}
              name="plano_conta_id"
              label="Plano de contas"
              hint="Opcional — vincule a categoria a uma conta analítica."
              options={planoContaOptions}
              error={form.formState.errors.plano_conta_id?.message}
            />
            <DreClassificationSelect
              register={form.register}
              setValue={form.setValue}
              watch={form.watch}
            />
            <FormField label="Cor" htmlFor="cor" hint="Ex.: #0EA5E9">
              <Input id="cor" {...form.register("cor")} placeholder="#0EA5E9" />
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
