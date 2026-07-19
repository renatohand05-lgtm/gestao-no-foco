"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { ContaPagarRateioFields } from "@/components/financeiro/conta-pagar-rateio-fields";
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
  createContaPagarAction,
  updateClassificacaoContaPagarAction,
  updateContaPagarAction,
} from "@/lib/financeiro/actions";
import { todayISO } from "@/lib/financeiro/conta-pagar-utils";
import { DRE_LINHA_LABELS, type DreLinhaEconomica } from "@/lib/dre";
import { contaPagarToFormValues } from "@/lib/financeiro/mappers";
import {
  classificacaoContaPagarFormSchema,
  contaPagarFormSchema,
  type ContaPagarFormInput,
  type ContaPagarFormValues,
} from "@/lib/financeiro/validations";
import { getFornecedorAutofillAction } from "@/lib/master-data/actions";
import { mergeAutofillWithoutOverwrite } from "@/lib/master-data/master-data-suggestions";
import type { ContaPagarAutofillSuggestion } from "@/lib/master-data/master-data-types";
import type {
  CategoriaFinanceiraOption,
  CentroCustoOption,
  ContaPagarDetail,
  FormaPagamentoOption,
  FornecedorOption,
  PlanoContaOption,
} from "@/types/contas-pagar";

const AUTOFILL_KEYS = [
  "categoria_financeira_id",
  "plano_conta_id",
  "centro_custo_id",
  "forma_pagamento_id",
] as const;

type Props = {
  tenantSlug: string;
  mode: "create" | "edit";
  item?: ContaPagarDetail;
  /** Quando true, só classificação contábil é editável (ex.: título já pago). */
  classificacaoOnly?: boolean;
  fornecedores: FornecedorOption[];
  formasPagamento: FormaPagamentoOption[];
  categorias: CategoriaFinanceiraOption[];
  centrosCusto: CentroCustoOption[];
  planoContas: PlanoContaOption[];
};

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60";

const numberFieldOptions = {
  setValueAs: (value: string | number) => {
    if (value === "" || value === null || value === undefined) return 0;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  },
};

function dreLabel(value: string | null | undefined) {
  if (!value) return null;
  return DRE_LINHA_LABELS[value as DreLinhaEconomica] ?? value;
}

export function ContaPagarForm({
  tenantSlug,
  mode,
  item,
  classificacaoOnly = false,
  fornecedores,
  formasPagamento,
  categorias,
  centrosCusto,
  planoContas,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autofillHint, setAutofillHint] = useState<{
    suggestion: ContaPagarAutofillSuggestion;
    applied: string[];
    skipped: string[];
  } | null>(null);
  const [autofillLoading, setAutofillLoading] = useState(false);
  const lockFinanceiro = classificacaoOnly;

  const form = useForm<ContaPagarFormInput, unknown, ContaPagarFormValues>({
    resolver: zodResolver(
      classificacaoOnly
        ? classificacaoContaPagarFormSchema
        : contaPagarFormSchema,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any,
    defaultValues: item
      ? contaPagarToFormValues(item)
      : {
          fornecedor_id: "",
          fornecedor_nome: "",
          forma_pagamento_id: "",
          categoria_financeira_id: "",
          centro_custo_id: "",
          plano_conta_id: "",
          descricao: "",
          valor_original: 0,
          desconto: 0,
          juros: 0,
          multa: 0,
          data_emissao: todayISO(),
          data_competencia: todayISO(),
          data_vencimento: todayISO(),
          parcelas: 1,
          observacoes: "",
          rateios: [],
        },
  });

  const categoriaId = useWatch({
    control: form.control,
    name: "categoria_financeira_id",
  });
  const planoId = useWatch({ control: form.control, name: "plano_conta_id" });
  const fornecedorIdWatch = useWatch({
    control: form.control,
    name: "fornecedor_id",
  });

  const linhaDre = useMemo(() => {
    const plano = planoContas.find((p) => p.id === planoId);
    const cat = categorias.find((c) => c.id === categoriaId);
    return dreLabel(plano?.dre_linha) ?? dreLabel(cat?.dre_linha) ?? null;
  }, [categoriaId, planoId, categorias, planoContas]);

  async function onSubmit(values: ContaPagarFormValues) {
    setLoading(true);
    setError(null);

    const result =
      mode === "create"
        ? await createContaPagarAction(tenantSlug, values)
        : classificacaoOnly
          ? await updateClassificacaoContaPagarAction(tenantSlug, item!.id, {
              categoria_financeira_id: values.categoria_financeira_id,
              centro_custo_id: values.centro_custo_id,
              plano_conta_id: values.plano_conta_id,
              data_competencia: values.data_competencia,
            })
          : await updateContaPagarAction(tenantSlug, item!.id, {
              ...values,
              parcelas: item?.parcela_total ?? 1,
            });

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const success = mode === "create" ? "created" : "updated";
    router.push(
      `/${tenantSlug}/financeiro/contas-pagar/${result.id}?success=${success}`,
    );
  }

  function handleCancel() {
    router.push(
      mode === "edit" && item
        ? `/${tenantSlug}/financeiro/contas-pagar/${item.id}`
        : `/${tenantSlug}/financeiro/contas-pagar`,
    );
  }

  async function handleFornecedorChange(fornecedorId: string) {
    form.setValue("fornecedor_id", fornecedorId);
    setAutofillHint(null);

    if (!fornecedorId || lockFinanceiro) return;

    const selected = fornecedores.find((f) => f.id === fornecedorId);
    const nomeLivre = form.getValues("fornecedor_nome");
    if (selected && (!nomeLivre || !String(nomeLivre).trim())) {
      form.setValue("fornecedor_nome", selected.nome);
    }

    setAutofillLoading(true);
    const result = await getFornecedorAutofillAction(tenantSlug, fornecedorId);
    setAutofillLoading(false);

    if (!result.success || !result.suggestion) return;

    const suggestion = result.suggestion;
    const current = form.getValues() as Record<string, unknown>;

    // Baixa confiança: só exibe dica — não aplica IDs.
    if (suggestion.confidence === "low") {
      setAutofillHint({ suggestion, applied: [], skipped: [] });
      return;
    }

    const { next, applied, skipped } = mergeAutofillWithoutOverwrite(
      current,
      suggestion,
      [...AUTOFILL_KEYS],
    );

    for (const [key, value] of Object.entries(next)) {
      form.setValue(key as keyof ContaPagarFormInput, value as never, {
        shouldDirty: true,
      });
    }

    setAutofillHint({ suggestion, applied, skipped });
  }

  return (
    <div className="relative">
      <LoadingOverlay loading={loading} label="Salvando..." />
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}

          {classificacaoOnly ? (
            <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Título já baixado: você pode corrigir apenas a classificação
              contábil (categoria, plano de contas, centro de custo e
              competência).
            </p>
          ) : null}

          <FormSection
            title="Identificação"
            description={
              classificacaoOnly
                ? "Ajuste a classificação do título."
                : "Fornecedor e classificação do título."
            }
          >
            <FormGrid>
              <FormField label="Fornecedor cadastrado" htmlFor="fornecedor_id">
                <select
                  id="fornecedor_id"
                  value={fornecedorIdWatch ?? ""}
                  onChange={(event) =>
                    void handleFornecedorChange(event.target.value)
                  }
                  className={selectClassName}
                  disabled={lockFinanceiro}
                >
                  <option value="">Sem vínculo</option>
                  {fornecedores.map((fornecedor) => (
                    <option key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.nome}
                      {fornecedor.documento ? ` · ${fornecedor.documento}` : ""}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label="Nome do fornecedor (livre)"
                htmlFor="fornecedor_nome"
              >
                <Input
                  id="fornecedor_nome"
                  {...form.register("fornecedor_nome")}
                  placeholder="Quando não houver cadastro"
                  disabled={lockFinanceiro}
                />
              </FormField>

              {autofillLoading ? (
                <p className="sm:col-span-2 text-sm text-muted-foreground">
                  Carregando sugestões do fornecedor…
                </p>
              ) : null}

              {autofillHint ? (
                <div className="sm:col-span-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
                  <p className="font-medium">
                    Sugestão do cadastro
                    {autofillHint.suggestion.confidence === "low"
                      ? " (baixa confiança — confirme manualmente)"
                      : ""}
                  </p>
                  <ul className="mt-1 list-inside list-disc text-xs opacity-90">
                    {autofillHint.suggestion.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                    {autofillHint.suggestion.dre_path_label ? (
                      <li>DRE: {autofillHint.suggestion.dre_path_label}</li>
                    ) : null}
                    {autofillHint.suggestion.recorrente ? (
                      <li>
                        Recorrente
                        {autofillHint.suggestion.frequencia
                          ? ` · ${autofillHint.suggestion.frequencia}`
                          : ""}
                      </li>
                    ) : null}
                    {autofillHint.applied.length > 0 ? (
                      <li>
                        Preenchido automaticamente:{" "}
                        {autofillHint.applied.join(", ")}
                      </li>
                    ) : null}
                    {autofillHint.skipped.length > 0 ? (
                      <li>
                        Mantido (já preenchido):{" "}
                        {autofillHint.skipped.join(", ")}
                      </li>
                    ) : null}
                  </ul>
                  <p className="mt-1 text-xs opacity-80">
                    Campos já preenchidos não são sobrescritos. Você pode alterar
                    qualquer valor.
                  </p>
                </div>
              ) : null}

              <FormField
                label="Forma de pagamento"
                htmlFor="forma_pagamento_id"
              >
                <select
                  id="forma_pagamento_id"
                  {...form.register("forma_pagamento_id")}
                  className={selectClassName}
                  disabled={lockFinanceiro}
                >
                  <option value="">Não informada</option>
                  {formasPagamento.map((forma) => (
                    <option key={forma.id} value={forma.id}>
                      {forma.nome}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label="Categoria financeira"
                htmlFor="categoria_financeira_id"
                required
                error={form.formState.errors.categoria_financeira_id?.message}
              >
                <select
                  id="categoria_financeira_id"
                  {...form.register("categoria_financeira_id")}
                  className={selectClassName}
                >
                  <option value="">Selecione a categoria</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                      {categoria.dre_linha
                        ? ` · ${dreLabel(categoria.dre_linha)}`
                        : ""}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label="Centro de custo"
                htmlFor="centro_custo_id"
                required
                error={form.formState.errors.centro_custo_id?.message}
              >
                <select
                  id="centro_custo_id"
                  {...form.register("centro_custo_id")}
                  className={selectClassName}
                >
                  <option value="">Selecione o centro de custo</option>
                  {centrosCusto.map((centro) => (
                    <option key={centro.id} value={centro.id}>
                      {centro.codigo} · {centro.nome}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label="Plano de contas"
                htmlFor="plano_conta_id"
                required
                error={form.formState.errors.plano_conta_id?.message}
              >
                <select
                  id="plano_conta_id"
                  {...form.register("plano_conta_id")}
                  className={selectClassName}
                >
                  <option value="">Selecione o plano de contas</option>
                  {planoContas.map((conta) => (
                    <option key={conta.id} value={conta.id}>
                      {conta.codigo} · {conta.nome}
                      {conta.dre_linha ? ` · ${dreLabel(conta.dre_linha)}` : ""}
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="sm:col-span-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Linha do DRE (automática)
                </p>
                <p className="mt-1 font-medium">
                  {linhaDre ?? (
                    <span className="text-amber-800">
                      Pendente de classificação — mapeie a categoria ou o plano
                    </span>
                  )}
                </p>
              </div>

              <FormField
                label="Descrição"
                htmlFor="descricao"
                required
                error={form.formState.errors.descricao?.message}
              >
                <Input
                  id="descricao"
                  {...form.register("descricao")}
                  disabled={lockFinanceiro}
                />
              </FormField>
            </FormGrid>
          </FormSection>

          {!classificacaoOnly ? (
            <FormSection
              title="Rateio"
              description="Distribua o título entre centros sem duplicar o valor no DRE."
            >
              <ContaPagarRateioFields
                centrosCusto={centrosCusto}
                disabled={lockFinanceiro}
              />
            </FormSection>
          ) : null}

          <FormSection title="Valores e datas">
            <FormGrid>
              <FormField
                label="Valor original"
                htmlFor="valor_original"
                required
                error={form.formState.errors.valor_original?.message}
              >
                <Input
                  id="valor_original"
                  type="number"
                  step="0.01"
                  disabled={lockFinanceiro}
                  {...form.register("valor_original", numberFieldOptions)}
                />
              </FormField>

              <FormField label="Desconto" htmlFor="desconto">
                <Input
                  id="desconto"
                  type="number"
                  step="0.01"
                  disabled={lockFinanceiro}
                  {...form.register("desconto", numberFieldOptions)}
                />
              </FormField>

              <FormField label="Juros" htmlFor="juros">
                <Input
                  id="juros"
                  type="number"
                  step="0.01"
                  disabled={lockFinanceiro}
                  {...form.register("juros", numberFieldOptions)}
                />
              </FormField>

              <FormField label="Multa" htmlFor="multa">
                <Input
                  id="multa"
                  type="number"
                  step="0.01"
                  disabled={lockFinanceiro}
                  {...form.register("multa", numberFieldOptions)}
                />
              </FormField>

              <FormField
                label="Emissão"
                htmlFor="data_emissao"
                required
                error={form.formState.errors.data_emissao?.message}
              >
                <Input
                  id="data_emissao"
                  type="date"
                  disabled={lockFinanceiro}
                  {...form.register("data_emissao")}
                />
              </FormField>

              <FormField
                label="Competência (DRE)"
                htmlFor="data_competencia"
                required
                error={form.formState.errors.data_competencia?.message}
              >
                <Input
                  id="data_competencia"
                  type="date"
                  {...form.register("data_competencia")}
                />
              </FormField>

              <FormField
                label="Vencimento"
                htmlFor="data_vencimento"
                required
                error={form.formState.errors.data_vencimento?.message}
              >
                <Input
                  id="data_vencimento"
                  type="date"
                  disabled={lockFinanceiro}
                  {...form.register("data_vencimento")}
                />
              </FormField>

              {mode === "create" ? (
                <FormField label="Parcelas" htmlFor="parcelas">
                  <Input
                    id="parcelas"
                    type="number"
                    min={1}
                    max={48}
                    {...form.register("parcelas", numberFieldOptions)}
                  />
                </FormField>
              ) : null}

              <FormField
                label="Observações"
                htmlFor="observacoes"
                className="sm:col-span-2"
              >
                <Textarea
                  id="observacoes"
                  rows={3}
                  disabled={lockFinanceiro}
                  {...form.register("observacoes")}
                />
              </FormField>
            </FormGrid>
          </FormSection>

          <div className="flex flex-wrap gap-3">
            <CancelButton type="button" onClick={handleCancel} />
            <SaveButton type="submit" loading={loading} />
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
