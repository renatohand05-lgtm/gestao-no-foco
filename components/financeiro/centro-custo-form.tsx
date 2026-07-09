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
  createCentroCustoAction,
  updateCentroCustoAction,
} from "@/lib/financeiro/actions";
import {
  FINANCEIRO_STATUS_OPTIONS,
} from "@/lib/financeiro/constants";
import { centroCustoToFormValues } from "@/lib/financeiro/mappers";
import {
  centroCustoFormSchema,
  type CentroCustoFormInput,
  type CentroCustoFormValues,
} from "@/lib/financeiro/validations";
import type { CentroCusto } from "@/types/financeiro";

type Props = {
  tenantSlug: string;
  mode: "create" | "edit";
  item?: CentroCusto;
};

const selectClassName = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function CentroCustoForm({ tenantSlug, mode, item }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<CentroCustoFormInput, unknown, CentroCustoFormValues>({
    resolver: zodResolver(centroCustoFormSchema),
    defaultValues: item ? centroCustoToFormValues(item) : {
          codigo: "",
          nome: "",
          descricao: "",
          responsavel: "",
          observacoes: "",
          ativo: true,
        },
  });

  async function onSubmit(values: CentroCustoFormValues) {
    setLoading(true);
    setError(null);

    const result =
      mode === "create"
        ? await createCentroCustoAction(tenantSlug, values)
        : await updateCentroCustoAction(tenantSlug, item!.id, values);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const success = mode === "create" ? "created" : "updated";
    router.push(
      `/${tenantSlug}/financeiro/centros-custo/${result.id}?success=${success}`,
    );
  }

  function handleCancel() {
    router.push(
      mode === "edit" && item
        ? `/${tenantSlug}/financeiro/centros-custo/${item.id}`
        : `/${tenantSlug}/financeiro/centros-custo`,
    );
  }

  return (
    <div className="relative">
      <LoadingOverlay loading={loading} label="Salvando..." />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}

        <FormSection title="Identificação" description="Dados do centro de custo.">
          <FormGrid>
            <FormField label="Código" htmlFor="codigo" required error={form.formState.errors.codigo?.message}>
              <Input id="codigo" {...form.register("codigo")} placeholder="CC-001" />
            </FormField>
            <FormField label="Nome" htmlFor="nome" required error={form.formState.errors.nome?.message}>
              <Input id="nome" {...form.register("nome")} placeholder="Operações" />
            </FormField>
            <FormField label="Responsável" htmlFor="responsavel">
              <Input id="responsavel" {...form.register("responsavel")} />
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
            <FormField label="Descrição" htmlFor="descricao" className="md:col-span-2">
              <Textarea id="descricao" {...form.register("descricao")} rows={2} />
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
