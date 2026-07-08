"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { CancelButton } from "@/components/ui/cancel-button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { FormField } from "@/components/ui/form-field";
import { FormGrid } from "@/components/ui/form-grid";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { SaveButton } from "@/components/ui/save-button";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  createVendaAction,
  updateVendaAction,
} from "@/lib/vendas/actions";
import {
  VENDA_FORMA_PAGAMENTO_OPTIONS,
  VENDA_STATUS_OPTIONS,
} from "@/lib/vendas/constants";
import {
  calcItemTotal,
  calcVendaTotais,
  formatCurrency,
  formatQuantity,
  toDateInputValue,
} from "@/lib/vendas/format";
import { vendaToFormValues } from "@/lib/vendas/mappers";
import {
  vendaFormSchema,
  type VendaFormInput,
  type VendaFormValues,
} from "@/lib/vendas/validations";
import { PRODUTO_TIPOS_SEM_ESTOQUE } from "@/lib/estoque/constants";
import type {
  ClienteOption,
  ProdutoOption,
  VendaDetail,
} from "@/types/vendas";

type VendaFormProps = {
  tenantSlug: string;
  mode: "create" | "edit";
  venda?: VendaDetail;
  clientes: ClienteOption[];
  produtos: ProdutoOption[];
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

const priceFieldOptions = {
  setValueAs: (value: string | number) => {
    if (value === "" || value === null || value === undefined) return 0;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  },
};

const statusEditaveis = VENDA_STATUS_OPTIONS.filter(
  (option) => option.value === "orcamento" || option.value === "em_andamento",
);

export function VendaForm({
  tenantSlug,
  mode,
  venda,
  clientes,
  produtos,
}: VendaFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const produtosMap = useMemo(
    () => new Map(produtos.map((produto) => [produto.id, produto])),
    [produtos],
  );

  const form = useForm<VendaFormInput, unknown, VendaFormValues>({
    resolver: zodResolver(vendaFormSchema),
    defaultValues: venda
      ? vendaToFormValues(venda)
      : {
          cliente_id: "",
          data_venda: toDateInputValue(),
          status: "orcamento",
          desconto_total: 0,
          forma_pagamento: "",
          observacoes: "",
          itens: [
            {
              produto_id: "",
              quantidade: 1,
              preco_unitario: 0,
              desconto: 0,
            },
          ],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "itens",
  });

  const watchedItens = useWatch({ control: form.control, name: "itens" });
  const descontoTotal = useWatch({ control: form.control, name: "desconto_total" }) ?? 0;

  const totais = useMemo(() => {
    const itensCalculados = (watchedItens ?? []).map((item) => {
      const produto = produtosMap.get(item.produto_id ?? "");
      return {
        quantidade: Number(item.quantidade) || 0,
        preco_unitario: Number(item.preco_unitario) || 0,
        desconto: Number(item.desconto) || 0,
        custo_unitario: produto?.custo ?? null,
      };
    });

    return calcVendaTotais(itensCalculados, Number(descontoTotal) || 0);
  }, [watchedItens, descontoTotal, produtosMap]);

  function handleProdutoChange(index: number, produtoId: string) {
    const produto = produtosMap.get(produtoId);
    form.setValue(`itens.${index}.produto_id`, produtoId);

    if (produto?.preco_venda !== null && produto?.preco_venda !== undefined) {
      form.setValue(`itens.${index}.preco_unitario`, produto.preco_venda);
    }
  }

  async function onSubmit(values: VendaFormValues) {
    setLoading(true);
    setError(null);

    const action =
      mode === "create"
        ? createVendaAction(tenantSlug, values)
        : updateVendaAction(tenantSlug, venda!.id, values);

    const result = await action;

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const success = mode === "create" ? "created" : "updated";
    router.push(`/${tenantSlug}/vendas/${result.id}?success=${success}`);
  }

  function handleCancel() {
    router.push(
      mode === "edit" && venda
        ? `/${tenantSlug}/vendas/${venda.id}`
        : `/${tenantSlug}/vendas`,
    );
  }

  return (
    <div className="relative">
      <LoadingOverlay loading={loading} label="Salvando..." />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}

        <FormSection
          title="Dados da venda"
          description="Cliente, data e condições comerciais."
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
                <option value="">Selecione um cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                    {cliente.documento ? ` — ${cliente.documento}` : ""}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Data da venda"
              htmlFor="data_venda"
              required
              error={form.formState.errors.data_venda?.message}
            >
              <Input id="data_venda" type="date" {...form.register("data_venda")} />
            </FormField>

            <FormField label="Status" htmlFor="status" required>
              <select
                id="status"
                {...form.register("status")}
                className={selectClassName}
              >
                {statusEditaveis.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Forma de pagamento" htmlFor="forma_pagamento">
              <select
                id="forma_pagamento"
                {...form.register("forma_pagamento")}
                className={selectClassName}
              >
                <option value="">Não informada</option>
                {VENDA_FORMA_PAGAMENTO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Desconto total (R$)"
              htmlFor="desconto_total"
              error={form.formState.errors.desconto_total?.message}
            >
              <Input
                id="desconto_total"
                type="number"
                step="0.01"
                min="0"
                {...form.register("desconto_total", numberFieldOptions)}
              />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection
          title="Itens"
          description="Produtos e serviços incluídos na venda."
        >
          <div className="space-y-4">
            {fields.map((field, index) => {
              const produtoId = watchedItens?.[index]?.produto_id ?? "";
              const produto = produtosMap.get(produtoId);
              const quantidade = Number(watchedItens?.[index]?.quantidade) || 0;
              const precoUnitario =
                Number(watchedItens?.[index]?.preco_unitario) || 0;
              const desconto = Number(watchedItens?.[index]?.desconto) || 0;
              const itemTotal = calcItemTotal(quantidade, precoUnitario, desconto);
              const semEstoque =
                produto &&
                !PRODUTO_TIPOS_SEM_ESTOQUE.includes(produto.tipo as "servico");

              return (
                <div
                  key={field.id}
                  className="rounded-lg border border-border p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Item {index + 1}</p>
                    {fields.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="mr-1 size-4" />
                        Remover
                      </Button>
                    ) : null}
                  </div>

                  <FormGrid>
                    <FormField
                      label="Produto / Serviço"
                      htmlFor={`itens.${index}.produto_id`}
                      required
                      error={form.formState.errors.itens?.[index]?.produto_id?.message}
                      className="md:col-span-2"
                    >
                      <select
                        id={`itens.${index}.produto_id`}
                        value={produtoId}
                        onChange={(event) =>
                          handleProdutoChange(index, event.target.value)
                        }
                        className={selectClassName}
                      >
                        <option value="">Selecione</option>
                        {produtos.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.nome}
                            {item.sku ? ` (${item.sku})` : ""}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <FormField
                      label="Quantidade"
                      htmlFor={`itens.${index}.quantidade`}
                      required
                      error={form.formState.errors.itens?.[index]?.quantidade?.message}
                    >
                      <Input
                        id={`itens.${index}.quantidade`}
                        type="number"
                        step="0.001"
                        min="0.001"
                        {...form.register(`itens.${index}.quantidade`, priceFieldOptions)}
                      />
                    </FormField>

                    <FormField
                      label="Preço unitário"
                      htmlFor={`itens.${index}.preco_unitario`}
                      required
                      error={
                        form.formState.errors.itens?.[index]?.preco_unitario?.message
                      }
                    >
                      <Input
                        id={`itens.${index}.preco_unitario`}
                        type="number"
                        step="0.01"
                        min="0"
                        {...form.register(
                          `itens.${index}.preco_unitario`,
                          priceFieldOptions,
                        )}
                      />
                    </FormField>

                    <FormField
                      label="Desconto (R$)"
                      htmlFor={`itens.${index}.desconto`}
                      error={form.formState.errors.itens?.[index]?.desconto?.message}
                    >
                      <Input
                        id={`itens.${index}.desconto`}
                        type="number"
                        step="0.01"
                        min="0"
                        {...form.register(`itens.${index}.desconto`, numberFieldOptions)}
                      />
                    </FormField>

                    <FormField label="Total do item">
                      <Input
                        readOnly
                        value={formatCurrency(itemTotal)}
                        className="bg-muted/40"
                      />
                    </FormField>
                  </FormGrid>

                  {produto && semEstoque ? (
                    <p className="text-xs text-muted-foreground">
                      Estoque disponível:{" "}
                      {formatQuantity(produto.estoque_atual, produto.unidade_medida)}
                      {quantidade > produto.estoque_atual ? (
                        <span className="ml-2 text-amber-600 dark:text-amber-400">
                          — estoque insuficiente para faturamento
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                </div>
              );
            })}

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                append({
                  produto_id: "",
                  quantidade: 1,
                  preco_unitario: 0,
                  desconto: 0,
                })
              }
            >
              <Plus className="mr-2 size-4" />
              Adicionar item
            </Button>

            {form.formState.errors.itens?.message ? (
              <FeedbackMessage variant="error">
                {form.formState.errors.itens.message}
              </FeedbackMessage>
            ) : null}
          </div>
        </FormSection>

        <FormSection title="Totais">
          <FormGrid>
            <FormField label="Subtotal">
              <Input
                readOnly
                value={formatCurrency(totais.subtotal)}
                className="bg-muted/40"
              />
            </FormField>
            <FormField label="Desconto total">
              <Input
                readOnly
                value={formatCurrency(descontoTotal)}
                className="bg-muted/40"
              />
            </FormField>
            <FormField label="Total">
              <Input
                readOnly
                value={formatCurrency(totais.total)}
                className="bg-muted/40 font-medium"
              />
            </FormField>
            {totais.margem_total !== null ? (
              <FormField label="Margem estimada">
                <Input
                  readOnly
                  value={formatCurrency(totais.margem_total)}
                  className="bg-muted/40"
                />
              </FormField>
            ) : null}
          </FormGrid>
        </FormSection>

        <FormSection title="Observações">
          <FormField label="Anotações" htmlFor="observacoes">
            <Textarea
              id="observacoes"
              rows={4}
              {...form.register("observacoes")}
              placeholder="Condições especiais, prazos de entrega, etc."
            />
          </FormField>
        </FormSection>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <CancelButton onClick={handleCancel} disabled={loading} />
          <SaveButton loading={loading}>
            {mode === "create" ? "Registrar venda" : "Salvar alterações"}
          </SaveButton>
        </div>
      </form>
    </div>
  );
}
