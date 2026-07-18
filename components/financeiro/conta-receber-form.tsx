"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
  createContaReceberAction,
  updateContaReceberAction,
} from "@/lib/financeiro/actions";
import { todayISO } from "@/lib/financeiro/conta-receber-utils";
import { contaReceberToFormValues } from "@/lib/financeiro/mappers";
import {
  contaReceberFormSchema,
  type ContaReceberFormInput,
  type ContaReceberFormValues,
} from "@/lib/financeiro/validations";
import type {
  CategoriaFinanceiraOption,
  CentroCustoOption,
  ClienteOption,
  ContaReceberDetail,
  FormaPagamentoOption,
  PlanoContaOption,
  VendaOption,
} from "@/types/contas-receber";

type Props = {
  tenantSlug: string;
  mode: "create" | "edit";
  item?: ContaReceberDetail;
  clientes: ClienteOption[];
  vendas: VendaOption[];
  formasPagamento: FormaPagamentoOption[];
  categorias: CategoriaFinanceiraOption[];
  centrosCusto: CentroCustoOption[];
  planoContas: PlanoContaOption[];
};

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const numberFieldOptions = {
  setValueAs: (value: string | number) => {
    if (value === "" || value === null || value === undefined) return 0;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  },
};

export function ContaReceberForm({
  tenantSlug,
  mode,
  item,
  clientes,
  vendas,
  formasPagamento,
  categorias,
  centrosCusto,
  planoContas,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const vendasMap = useMemo(
    () => new Map(vendas.map((venda) => [venda.id, venda])),
    [vendas],
  );

  const form = useForm<ContaReceberFormInput, unknown, ContaReceberFormValues>({
    resolver: zodResolver(contaReceberFormSchema),
    defaultValues: item
      ? contaReceberToFormValues(item)
      : {
          cliente_id: "",
          venda_id: "",
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

  function handleVendaChange(vendaId: string) {
    form.setValue("venda_id", vendaId);

    if (!vendaId) return;

    const venda = vendasMap.get(vendaId);
    if (!venda) return;

    form.setValue("cliente_id", venda.cliente_id);
    form.setValue("valor_original", venda.total);
    form.setValue("descricao", `Venda #${venda.numero}`);
  }

  async function onSubmit(values: ContaReceberFormValues) {
    setLoading(true);
    setError(null);

    const payload =
      mode === "edit" ? { ...values, parcelas: item?.parcela_total ?? 1 } : values;

    const result =
      mode === "create"
        ? await createContaReceberAction(tenantSlug, payload)
        : await updateContaReceberAction(tenantSlug, item!.id, payload);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const success = mode === "create" ? "created" : "updated";
    router.push(
      `/${tenantSlug}/financeiro/contas-receber/${result.id}?success=${success}`,
    );
  }

  function handleCancel() {
    router.push(
      mode === "edit" && item
        ? `/${tenantSlug}/financeiro/contas-receber/${item.id}`
        : `/${tenantSlug}/financeiro/contas-receber`,
    );
  }

  return (
    <div className="relative">
      <LoadingOverlay loading={loading} label="Salvando..." />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}

        <FormSection
          title="Identificação"
          description="Cliente, venda e classificação do título."
        >
          <FormGrid>
            <FormField
              label="Cliente"
              htmlFor="cliente_id"
              required
              error={form.formState.errors.cliente_id?.message}
              className="md:col-span-2"
            >
              <select
                id="cliente_id"
                {...form.register("cliente_id")}
                className={selectClassName}
              >
                <option value="">Selecione o cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                    {cliente.documento ? ` · ${cliente.documento}` : ""}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Venda (opcional)" htmlFor="venda_id">
              <Controller
                control={form.control}
                name="venda_id"
                render={({ field }) => (
                  <select
                    id="venda_id"
                    value={field.value ?? ""}
                    onChange={(event) => handleVendaChange(event.target.value)}
                    className={selectClassName}
                    disabled={mode === "edit"}
                  >
                    <option value="">Sem vínculo com venda</option>
                    {vendas.map((venda) => (
                      <option key={venda.id} value={venda.id}>
                        #{venda.numero} · {formatCurrencyLabel(venda.total)}
                      </option>
                    ))}
                  </select>
                )}
              />
            </FormField>

            <FormField label="Forma de pagamento" htmlFor="forma_pagamento_id">
              <select
                id="forma_pagamento_id"
                {...form.register("forma_pagamento_id")}
                className={selectClassName}
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
                <option value="">Não informada</option>
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
                <option value="">Não informado</option>
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
                placeholder="Recebimento de serviços"
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
              />
            </FormField>
            <FormField label="Desconto" htmlFor="desconto">
              <Input
                id="desconto"
                type="number"
                step="0.01"
                {...form.register("desconto", numberFieldOptions)}
              />
            </FormField>
            <FormField label="Juros" htmlFor="juros">
              <Input
                id="juros"
                type="number"
                step="0.01"
                {...form.register("juros", numberFieldOptions)}
              />
            </FormField>
            <FormField label="Multa" htmlFor="multa">
              <Input
                id="multa"
                type="number"
                step="0.01"
                {...form.register("multa", numberFieldOptions)}
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
            <Textarea id="observacoes" rows={3} {...form.register("observacoes")} />
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

function formatCurrencyLabel(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
