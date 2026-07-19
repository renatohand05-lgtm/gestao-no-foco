"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { MetaVendasDeleteButton } from "@/components/metas/meta-vendas-delete-button";
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
  createMetaVendasAction,
  updateMetaVendasAction,
} from "@/lib/metas/actions";
import { metaVendasToFormValues } from "@/lib/metas/mappers";
import {
  metaVendasFormSchema,
  metaVendasUpdateSchema,
  type MetaVendasFormInput,
  type MetaVendasFormValues,
  type MetaVendasUpdateInput,
  type MetaVendasUpdateValues,
} from "@/lib/metas/validations";
import type { MetaVendasMensal } from "@/types/metas-vendas";

type CentroOption = { id: string; nome: string };

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

type SharedProps = {
  tenantSlug: string;
  centrosCusto: CentroOption[];
};

export function MetaVendasForm(
  props:
    | (SharedProps & {
        mode: "create";
        defaultCompetencia?: string;
        defaultCentroCustoId?: string | null;
      })
    | (SharedProps & { mode: "edit"; item: MetaVendasMensal }),
) {
  if (props.mode === "edit") {
    return (
      <MetaVendasEditForm
        tenantSlug={props.tenantSlug}
        item={props.item}
        centrosCusto={props.centrosCusto}
      />
    );
  }

  return (
    <MetaVendasCreateForm
      tenantSlug={props.tenantSlug}
      centrosCusto={props.centrosCusto}
      defaultCompetencia={props.defaultCompetencia}
      defaultCentroCustoId={props.defaultCentroCustoId}
    />
  );
}

function CentroCustoSelect({
  value,
  onChange,
  centrosCusto,
  id = "centro_custo_id",
}: {
  value: string | null | undefined;
  onChange: (value: string) => void;
  centrosCusto: CentroOption[];
  id?: string;
}) {
  return (
    <select
      id={id}
      className={selectClassName}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
      aria-label="Centro de custo"
    >
      <option value="">Meta geral (sem centro)</option>
      {centrosCusto.map((centro) => (
        <option key={centro.id} value={centro.id}>
          {centro.nome}
        </option>
      ))}
    </select>
  );
}

function MetaVendasCreateForm({
  tenantSlug,
  centrosCusto,
  defaultCompetencia,
  defaultCentroCustoId,
}: SharedProps & {
  defaultCompetencia?: string;
  defaultCentroCustoId?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const form = useForm<MetaVendasFormInput, unknown, MetaVendasFormValues>({
    resolver: zodResolver(metaVendasFormSchema),
    defaultValues: {
      competencia: (defaultCompetencia ?? defaultMonth).slice(0, 7),
      valor_meta: 0,
      centro_custo_id: defaultCentroCustoId ?? "",
      observacao: "",
    },
  });

  async function onSubmit(values: MetaVendasFormValues) {
    setLoading(true);
    setError(null);
    const result = await createMetaVendasAction(tenantSlug, values);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.push(`/${tenantSlug}/configuracoes/metas`);
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="relative space-y-6">
      <LoadingOverlay loading={loading} label="Salvando meta…" />
      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}

      <FormSection
        title="Meta mensal de vendas"
        description="Competência no primeiro dia do mês. Meta geral quando o centro de custo não é informado."
      >
        <FormGrid>
          <FormField
            label="Competência"
            htmlFor="competencia"
            error={form.formState.errors.competencia?.message}
          >
            <Input
              id="competencia"
              type="month"
              {...form.register("competencia")}
            />
          </FormField>

          <FormField
            label="Valor da meta"
            htmlFor="valor_meta"
            error={form.formState.errors.valor_meta?.message}
          >
            <Input
              id="valor_meta"
              type="number"
              step="0.01"
              min="0"
              {...form.register("valor_meta", { valueAsNumber: true })}
            />
          </FormField>

          <FormField
            label="Centro de custo (opcional)"
            htmlFor="centro_custo_id"
            error={form.formState.errors.centro_custo_id?.message}
          >
            <Controller
              control={form.control}
              name="centro_custo_id"
              render={({ field }) => (
                <CentroCustoSelect
                  value={field.value}
                  onChange={field.onChange}
                  centrosCusto={centrosCusto}
                />
              )}
            />
          </FormField>

          <FormField
            label="Observação"
            htmlFor="observacao"
            className="md:col-span-2"
            error={form.formState.errors.observacao?.message}
          >
            <Textarea id="observacao" rows={3} {...form.register("observacao")} />
          </FormField>
        </FormGrid>
      </FormSection>

      <div className="flex flex-wrap gap-3">
        <SaveButton loading={loading}>Salvar meta</SaveButton>
        <CancelButton
          render={<Link href={`/${tenantSlug}/configuracoes/metas`} />}
        />
      </div>
    </form>
  );
}

function MetaVendasEditForm({
  tenantSlug,
  item,
  centrosCusto,
}: SharedProps & { item: MetaVendasMensal }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const defaults = metaVendasToFormValues(item);

  const form = useForm<MetaVendasUpdateInput, unknown, MetaVendasUpdateValues>({
    resolver: zodResolver(metaVendasUpdateSchema),
    defaultValues: {
      valor_meta: defaults.valor_meta,
      centro_custo_id: defaults.centro_custo_id,
      observacao: defaults.observacao,
    },
  });

  async function onSubmit(values: MetaVendasUpdateValues) {
    setLoading(true);
    setError(null);
    const result = await updateMetaVendasAction(tenantSlug, item.id, values);
    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    router.push(`/${tenantSlug}/configuracoes/metas`);
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="relative space-y-6">
      <LoadingOverlay loading={loading} label="Atualizando meta…" />
      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}

      <FormSection
        title="Editar meta"
        description={`Competência ${item.competencia.slice(0, 7)} · altere o valor, o centro ou a observação.`}
      >
        <FormGrid>
          <FormField
            label="Valor da meta"
            htmlFor="valor_meta"
            error={form.formState.errors.valor_meta?.message}
          >
            <Input
              id="valor_meta"
              type="number"
              step="0.01"
              min="0"
              {...form.register("valor_meta", { valueAsNumber: true })}
            />
          </FormField>

          <FormField
            label="Centro de custo (opcional)"
            htmlFor="centro_custo_id"
            error={form.formState.errors.centro_custo_id?.message}
          >
            <Controller
              control={form.control}
              name="centro_custo_id"
              render={({ field }) => (
                <CentroCustoSelect
                  value={field.value}
                  onChange={field.onChange}
                  centrosCusto={centrosCusto}
                />
              )}
            />
          </FormField>

          <FormField
            label="Observação"
            htmlFor="observacao"
            className="md:col-span-2"
            error={form.formState.errors.observacao?.message}
          >
            <Textarea id="observacao" rows={3} {...form.register("observacao")} />
          </FormField>
        </FormGrid>
      </FormSection>

      <div className="flex flex-wrap gap-3">
        <SaveButton loading={loading}>Salvar alterações</SaveButton>
        <MetaVendasDeleteButton
          tenantSlug={tenantSlug}
          metaId={item.id}
          competencia={item.competencia}
          centroNome={item.centro_custo_nome}
          valorMeta={item.valor_meta}
          redirectToList
        />
        <CancelButton
          render={<Link href={`/${tenantSlug}/configuracoes/metas`} />}
        />
      </div>
    </form>
  );
}
