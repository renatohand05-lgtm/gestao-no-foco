"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

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
  createProdutoAction,
  updateProdutoAction,
} from "@/lib/produtos/actions";
import {
  PRODUTO_STATUS_OPTIONS,
  PRODUTO_TIPO_OPTIONS,
  PRODUTO_TIPOS_COM_ESTOQUE,
  UNIDADE_MEDIDA_OPTIONS,
} from "@/lib/produtos/constants";
import { formatPercent, calcMargemPercent } from "@/lib/produtos/format";
import { produtoToFormValues } from "@/lib/produtos/mappers";
import {
  produtoFormSchema,
  type ProdutoFormInput,
  type ProdutoFormValues,
} from "@/lib/produtos/validations";
import type { Produto } from "@/types/produtos";

type ProdutoFormProps = {
  tenantSlug: string;
  mode: "create" | "edit";
  produto?: Produto;
};

const numberFieldOptions = {
  setValueAs: (value: string | number) => {
    if (value === "" || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  },
};

const estoqueFieldOptions = {
  setValueAs: (value: string | number) => {
    if (value === "" || value === null || value === undefined) return 0;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  },
};

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function ProdutoForm({ tenantSlug, mode, produto }: ProdutoFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<ProdutoFormInput, unknown, ProdutoFormValues>({
    resolver: zodResolver(produtoFormSchema),
    defaultValues: produto
      ? produtoToFormValues(produto)
      : {
          nome: "",
          tipo: "produto",
          codigo_interno: "",
          sku: "",
          codigo_barras: "",
          categoria: "",
          subcategoria: "",
          marca: "",
          unidade_medida: "UN",
          custo: null,
          preco_venda: null,
          estoque_atual: 0,
          estoque_minimo: null,
          estoque_maximo: null,
          localizacao: "",
          fornecedor_principal: "",
          observacoes: "",
          ativo: true,
        },
  });

  const [tipo, custo, precoVenda] = useWatch({
    control: form.control,
    name: ["tipo", "custo", "preco_venda"],
  });

  const margem = useMemo(
    () => calcMargemPercent(custo, precoVenda),
    [custo, precoVenda],
  );

  const showEstoque = PRODUTO_TIPOS_COM_ESTOQUE.includes(
    tipo as (typeof PRODUTO_TIPOS_COM_ESTOQUE)[number],
  );

  async function onSubmit(values: ProdutoFormValues) {
    setLoading(true);
    setError(null);

    const action =
      mode === "create"
        ? createProdutoAction(tenantSlug, values)
        : updateProdutoAction(tenantSlug, produto!.id, values);

    const result = await action;

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const success = mode === "create" ? "created" : "updated";
    router.push(
      `/${tenantSlug}/produtos/${result.id}?success=${success}`,
    );
  }

  function handleCancel() {
    router.push(
      mode === "edit" && produto
        ? `/${tenantSlug}/produtos/${produto.id}`
        : `/${tenantSlug}/produtos`,
    );
  }

  return (
    <div className="relative">
      <LoadingOverlay loading={loading} label="Salvando..." />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}

        <FormSection
          title="Identificação"
          description="Dados principais do produto ou serviço."
        >
          <FormGrid>
            <FormField label="Status" htmlFor="ativo" required>
              <Controller
                control={form.control}
                name="ativo"
                render={({ field }) => (
                  <select
                    id="ativo"
                    value={String(field.value)}
                    onChange={(event) =>
                      field.onChange(event.target.value === "true")
                    }
                    className={selectClassName}
                  >
                    {PRODUTO_STATUS_OPTIONS.map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              />
            </FormField>

            <FormField label="Tipo" htmlFor="tipo" required>
              <select
                id="tipo"
                {...form.register("tipo")}
                className={selectClassName}
              >
                {PRODUTO_TIPO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Nome"
              htmlFor="nome"
              required
              error={form.formState.errors.nome?.message}
              className="md:col-span-2"
            >
              <Input id="nome" {...form.register("nome")} placeholder="Nome do item" />
            </FormField>

            <FormField label="Código interno" htmlFor="codigo_interno">
              <Input id="codigo_interno" {...form.register("codigo_interno")} />
            </FormField>

            <FormField label="SKU" htmlFor="sku">
              <Input id="sku" {...form.register("sku")} />
            </FormField>

            <FormField label="Código de barras" htmlFor="codigo_barras" className="md:col-span-2">
              <Input id="codigo_barras" {...form.register("codigo_barras")} />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection
          title="Classificação"
          description="Organização do catálogo por categoria e marca."
        >
          <FormGrid>
            <FormField label="Categoria" htmlFor="categoria">
              <Input id="categoria" {...form.register("categoria")} />
            </FormField>

            <FormField label="Subcategoria" htmlFor="subcategoria">
              <Input id="subcategoria" {...form.register("subcategoria")} />
            </FormField>

            <FormField label="Marca" htmlFor="marca">
              <Input id="marca" {...form.register("marca")} />
            </FormField>

            <FormField label="Unidade de medida" htmlFor="unidade_medida" required>
              <select
                id="unidade_medida"
                {...form.register("unidade_medida")}
                className={selectClassName}
              >
                {UNIDADE_MEDIDA_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection
          title="Precificação"
          description="Custo, preço de venda e margem calculada automaticamente."
        >
          <FormGrid>
            <FormField
              label="Custo"
              htmlFor="custo"
              error={form.formState.errors.custo?.message}
            >
              <Input
                id="custo"
                type="number"
                step="0.01"
                min="0"
                {...form.register("custo", numberFieldOptions)}
              />
            </FormField>

            <FormField
              label="Preço de venda"
              htmlFor="preco_venda"
              error={form.formState.errors.preco_venda?.message}
            >
              <Input
                id="preco_venda"
                type="number"
                step="0.01"
                min="0"
                {...form.register("preco_venda", numberFieldOptions)}
              />
            </FormField>

            <FormField label="Margem automática" htmlFor="margem">
              <Input
                id="margem"
                readOnly
                value={margem === null ? "—" : formatPercent(margem)}
                className="bg-muted/40"
              />
            </FormField>
          </FormGrid>
        </FormSection>

        {showEstoque ? (
          <FormSection
            title="Estoque"
            description="Controle de quantidade e localização."
          >
            <FormGrid>
              <FormField
                label="Estoque atual"
                htmlFor="estoque_atual"
                error={form.formState.errors.estoque_atual?.message}
              >
                <Input
                  id="estoque_atual"
                  type="number"
                  step="0.001"
                  min="0"
                  {...form.register("estoque_atual", estoqueFieldOptions)}
                />
              </FormField>

              <FormField
                label="Estoque mínimo"
                htmlFor="estoque_minimo"
                error={form.formState.errors.estoque_minimo?.message}
              >
                <Input
                  id="estoque_minimo"
                  type="number"
                  step="0.001"
                  min="0"
                  {...form.register("estoque_minimo", numberFieldOptions)}
                />
              </FormField>

              <FormField
                label="Estoque máximo"
                htmlFor="estoque_maximo"
              >
                <Input
                  id="estoque_maximo"
                  type="number"
                  step="0.001"
                  min="0"
                  {...form.register("estoque_maximo", numberFieldOptions)}
                />
              </FormField>

              <FormField label="Localização" htmlFor="localizacao">
                <Input
                  id="localizacao"
                  {...form.register("localizacao")}
                  placeholder="Corredor, prateleira, depósito"
                />
              </FormField>
            </FormGrid>
          </FormSection>
        ) : null}

        <FormSection title="Fornecimento">
          <FormField label="Fornecedor principal" htmlFor="fornecedor_principal">
            <Input
              id="fornecedor_principal"
              {...form.register("fornecedor_principal")}
            />
          </FormField>
        </FormSection>

        <FormSection title="Observações">
          <FormField label="Anotações internas" htmlFor="observacoes">
            <Textarea
              id="observacoes"
              rows={4}
              {...form.register("observacoes")}
              placeholder="Informações adicionais sobre o item"
            />
          </FormField>
        </FormSection>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <CancelButton onClick={handleCancel} disabled={loading} />
          <SaveButton loading={loading}>
            {mode === "create" ? "Cadastrar item" : "Salvar alterações"}
          </SaveButton>
        </div>
      </form>
    </div>
  );
}
