"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

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
import { contaPagarToFormValues } from "@/lib/financeiro/mappers";
import {
  classificacaoContaPagarFormSchema,
  contaPagarFormSchema,
  type ContaPagarFormInput,
  type ContaPagarFormValues,
} from "@/lib/financeiro/validations";
import type {
  CategoriaFinanceiraOption,
  CentroCustoOption,
  ContaPagarDetail,
  FormaPagamentoOption,
  FornecedorOption,
  PlanoContaOption,
} from "@/types/contas-pagar";

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
  const lockFinanceiro = classificacaoOnly;

  const form = useForm<ContaPagarFormInput, unknown, ContaPagarFormValues>({
    // Em modo classificação o RHF omite campos disabled no submit;
    // por isso validamos só os 4 campos editáveis.
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
        },
  });

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

  return (
    <div className="relative">
      <LoadingOverlay loading={loading} label="Salvando..." />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}

        {classificacaoOnly ? (
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Título já baixado: você pode corrigir apenas a classificação contábil
            (categoria, plano de contas, centro de custo e competência).
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
                {...form.register("fornecedor_id")}
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

            <FormField label="Forma de pagamento" htmlFor="forma_pagamento_id">
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
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Descrição"
              htmlFor="descricao"
              required
              error={form.formState.errors.descricao?.message}
              className="md:col-span-2"
            >
              <Input
                id="descricao"
                {...form.register("descricao")}
                placeholder="Pagamento de fornecedor"
                disabled={lockFinanceiro}
              />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection title="Valores e datas" description="Montante e vencimento.">
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
                {...form.register("valor_original", numberFieldOptions)}
                disabled={lockFinanceiro}
              />
            </FormField>
            <FormField label="Desconto" htmlFor="desconto">
              <Input
                id="desconto"
                type="number"
                step="0.01"
                {...form.register("desconto", numberFieldOptions)}
                disabled={lockFinanceiro}
              />
            </FormField>
            <FormField label="Juros" htmlFor="juros">
              <Input
                id="juros"
                type="number"
                step="0.01"
                {...form.register("juros", numberFieldOptions)}
                disabled={lockFinanceiro}
              />
            </FormField>
            <FormField label="Multa" htmlFor="multa">
              <Input
                id="multa"
                type="number"
                step="0.01"
                {...form.register("multa", numberFieldOptions)}
                disabled={lockFinanceiro}
              />
            </FormField>
            <FormField
              label="Data de emissão"
              htmlFor="data_emissao"
              required
              error={form.formState.errors.data_emissao?.message}
            >
              <Input
                id="data_emissao"
                type="date"
                {...form.register("data_emissao")}
                disabled={lockFinanceiro}
              />
            </FormField>
            <FormField
              label="Data de competência"
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
              label="Data de vencimento"
              htmlFor="data_vencimento"
              required
              error={form.formState.errors.data_vencimento?.message}
            >
              <Input
                id="data_vencimento"
                type="date"
                {...form.register("data_vencimento")}
                disabled={lockFinanceiro}
              />
            </FormField>
            {mode === "create" ? (
              <FormField
                label="Parcelas"
                htmlFor="parcelas"
                error={form.formState.errors.parcelas?.message}
              >
                <Input
                  id="parcelas"
                  type="number"
                  min={1}
                  max={48}
                  {...form.register("parcelas", {
                    setValueAs: (value: string | number) => {
                      const parsed = Number(value);
                      return Number.isNaN(parsed) ? 1 : parsed;
                    },
                  })}
                />
              </FormField>
            ) : (
              <FormField label="Parcela">
                <Input
                  value={`${item?.parcela_numero}/${item?.parcela_total}`}
                  disabled
                />
              </FormField>
            )}
          </FormGrid>
        </FormSection>

        <FormSection title="Observações">
          <FormField label="Observações" htmlFor="observacoes">
            <Textarea
              id="observacoes"
              rows={3}
              {...form.register("observacoes")}
              disabled={lockFinanceiro}
            />
          </FormField>
        </FormSection>

        <div className="flex flex-wrap gap-3">
          <SaveButton type="submit" />
          <CancelButton type="button" onClick={handleCancel} />
        </div>
      </form>
    </div>
  );
}
