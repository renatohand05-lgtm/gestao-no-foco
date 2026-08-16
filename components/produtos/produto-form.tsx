"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { CancelButton } from "@/components/ui/cancel-button";
import { NativeSelect } from "@/components/ui/native-select";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { FormField } from "@/components/ui/form-field";
import { FormGrid } from "@/components/ui/form-grid";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { SaveButton } from "@/components/ui/save-button";
import { Textarea } from "@/components/ui/textarea";
import type { ProdutoTipo } from "@/types/produtos";
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
import {
  isCatalogFieldHidden,
  itemTypeOptionsForForm,
  type SegmentCatalogFormConfig,
} from "@/lib/segments/form-config.ts";

type ProdutoFormProps = {
  tenantSlug: string;
  mode: "create" | "edit";
  produto?: Produto;
  defaultTipo?: ProdutoTipo;
  formConfig?: SegmentCatalogFormConfig;
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

export function ProdutoForm({
  tenantSlug,
  mode,
  produto,
  defaultTipo = "produto",
  formConfig,
}: ProdutoFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const tipoOptions = itemTypeOptionsForForm(
    formConfig ?? {
      segment: "oficina",
      allowedItemTypes: [...PRODUTO_TIPO_OPTIONS],
      allowedOperationTypes: ["work_order"],
      visibleFields: [],
      hiddenFields: [],
      optionalFields: [],
      requiredFields: [],
      serviceLibrary: "oficina",
    },
    produto?.tipo ?? defaultTipo,
  );
  const allowedValues = tipoOptions.map((option) => option.value);
  const fallbackTipo = allowedValues.includes("servico")
    ? "servico"
    : (allowedValues[0] ?? "produto");
  const initialTipo = allowedValues.includes(defaultTipo)
    ? defaultTipo
    : fallbackTipo;

  const hide = (field: Parameters<typeof isCatalogFieldHidden>[1]) =>
    formConfig ? isCatalogFieldHidden(formConfig, field) : false;

  const form = useForm<ProdutoFormInput, unknown, ProdutoFormValues>({
    resolver: zodResolver(produtoFormSchema),
    defaultValues: produto
      ? produtoToFormValues(produto)
      : {
          nome: "",
          tipo: initialTipo,
          codigo_interno: "",
          sku: "",
          codigo_barras: "",
          categoria: "",
          subcategoria: "",
          marca: "",
          fabricante: "",
          descricao_resumida: "",
          unidade_medida: "UN",
          ncm: "",
          cest: "",
          origem_mercadoria: "",
          peso_kg: null,
          dimensoes: "",
          altura_cm: null,
          largura_cm: null,
          comprimento_cm: null,
          custo: null,
          custo_reposicao: null,
          preco_venda: null,
          preco_minimo: null,
          margem_alvo: null,
          estoque_atual: 0,
          estoque_minimo: null,
          estoque_maximo: null,
          estoque_seguranca: null,
          localizacao: "",
          fornecedor_principal: "",
          fornecedor_alternativo: "",
          controla_estoque: initialTipo !== "servico",
          controla_lote: false,
          controla_serie: false,
          controla_validade: false,
          observacoes: "",
          ativo: true,
          tempo_estimado_minutos: null,
          preco_sugerido: null,
          especialidade: "",
          equipe_ou_profissional: "",
          unidade_cobranca: "",
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

  const showEstoque =
    PRODUTO_TIPOS_COM_ESTOQUE.includes(
      tipo as (typeof PRODUTO_TIPOS_COM_ESTOQUE)[number],
    ) && !hide("estoque");
  const showFiscal =
    !hide("ncm") ||
    !hide("cest") ||
    !hide("origem_mercadoria") ||
    !hide("peso_kg") ||
    !hide("dimensoes");

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
                  <NativeSelect
                    id="ativo"
                    value={String(field.value)}
                    onChange={(event) =>
                      field.onChange(event.target.value === "true")
                    }
                  >
                    {PRODUTO_STATUS_OPTIONS.map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              />
            </FormField>

            <FormField label="Tipo" htmlFor="tipo" required>
              <NativeSelect
                id="tipo"
                {...form.register("tipo")}
              >
                {tipoOptions.map((option) => (
                  <option key={`${option.value}-${option.label}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
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

            {!hide("codigo_interno") ? (
            <FormField label="Código interno" htmlFor="codigo_interno">
              <Input id="codigo_interno" {...form.register("codigo_interno")} />
            </FormField>
            ) : null}

            {!hide("sku") ? (
            <FormField label="SKU" htmlFor="sku">
              <Input id="sku" {...form.register("sku")} />
            </FormField>
            ) : null}

            {!hide("codigo_barras") ? (
            <FormField label="Código de barras" htmlFor="codigo_barras" className="md:col-span-2">
              <Input id="codigo_barras" {...form.register("codigo_barras")} />
            </FormField>
            ) : null}
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

            {!hide("marca") ? (
            <FormField label="Marca" htmlFor="marca">
              <Input id="marca" {...form.register("marca")} />
            </FormField>
            ) : null}

            {!hide("fabricante") ? (
            <FormField label="Fabricante" htmlFor="fabricante">
              <Input id="fabricante" {...form.register("fabricante")} />
            </FormField>
            ) : null}

            <FormField label="Descrição resumida" htmlFor="descricao_resumida" className="md:col-span-2">
              <Input
                id="descricao_resumida"
                {...form.register("descricao_resumida")}
                placeholder="Resumo curto do item"
              />
            </FormField>

            <FormField label="Unidade de medida" htmlFor="unidade_medida" required>
              <NativeSelect
                id="unidade_medida"
                {...form.register("unidade_medida")}
              >
                {UNIDADE_MEDIDA_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </FormGrid>
        </FormSection>

        {showFiscal ? (
        <FormSection
          title="Fiscal e dimensões"
          description="Campos opcionais para Tax Intelligence (NCM/CEST) e logística. Sem inventar impostos."
        >
          <FormGrid>
            {!hide("ncm") ? (
            <FormField
              label="NCM"
              htmlFor="ncm"
              error={form.formState.errors.ncm?.message}
            >
              <Input id="ncm" {...form.register("ncm")} placeholder="8 dígitos" />
            </FormField>
            ) : null}
            {!hide("cest") ? (
            <FormField label="CEST" htmlFor="cest">
              <Input id="cest" {...form.register("cest")} />
            </FormField>
            ) : null}
            {!hide("origem_mercadoria") ? (
            <FormField label="Origem" htmlFor="origem_mercadoria">
              <Input
                id="origem_mercadoria"
                {...form.register("origem_mercadoria")}
                placeholder="Ex.: 0 nacional"
              />
            </FormField>
            ) : null}
            {!hide("peso_kg") ? (
            <FormField label="Peso (kg)" htmlFor="peso_kg">
              <Input
                id="peso_kg"
                type="number"
                step="0.001"
                min="0"
                {...form.register("peso_kg", numberFieldOptions)}
              />
            </FormField>
            ) : null}
            {!hide("altura_cm") ? (
            <FormField label="Altura (cm)" htmlFor="altura_cm">
              <Input
                id="altura_cm"
                type="number"
                step="0.01"
                min="0"
                {...form.register("altura_cm", numberFieldOptions)}
              />
            </FormField>
            ) : null}
            {!hide("largura_cm") ? (
            <FormField label="Largura (cm)" htmlFor="largura_cm">
              <Input
                id="largura_cm"
                type="number"
                step="0.01"
                min="0"
                {...form.register("largura_cm", numberFieldOptions)}
              />
            </FormField>
            ) : null}
            {!hide("comprimento_cm") ? (
            <FormField label="Comprimento (cm)" htmlFor="comprimento_cm">
              <Input
                id="comprimento_cm"
                type="number"
                step="0.01"
                min="0"
                {...form.register("comprimento_cm", numberFieldOptions)}
              />
            </FormField>
            ) : null}
            {!hide("dimensoes") ? (
            <FormField label="Dimensões (texto)" htmlFor="dimensoes">
              <Input id="dimensoes" {...form.register("dimensoes")} />
            </FormField>
            ) : null}
          </FormGrid>
        </FormSection>
        ) : null}

        <FormSection
          title="Precificação"
          description={
            tipo === "servico"
              ? "Custo de mão de obra, preço atual e preço sugerido."
              : "Custo, preço de venda e margem calculada automaticamente."
          }
        >
          <FormGrid>
            <FormField
              label={tipo === "servico" ? "Custo de mão de obra" : "Custo médio"}
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
              label="Custo de reposição"
              htmlFor="custo_reposicao"
              error={form.formState.errors.custo_reposicao?.message}
            >
              <Input
                id="custo_reposicao"
                type="number"
                step="0.01"
                min="0"
                {...form.register("custo_reposicao", numberFieldOptions)}
              />
            </FormField>

            <FormField
              label={tipo === "servico" ? "Preço atual" : "Preço de venda"}
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

            {tipo === "servico" ? (
              <>
                {!hide("preco_sugerido") ? (
                <FormField
                  label="Preço sugerido"
                  htmlFor="preco_sugerido"
                  error={form.formState.errors.preco_sugerido?.message}
                >
                  <Input
                    id="preco_sugerido"
                    type="number"
                    step="0.01"
                    min="0"
                    {...form.register("preco_sugerido", numberFieldOptions)}
                  />
                </FormField>
                ) : null}
                <FormField
                  label="Tempo estimado (minutos)"
                  htmlFor="tempo_estimado_minutos"
                >
                  <Input
                    id="tempo_estimado_minutos"
                    type="number"
                    min="0"
                    step="1"
                    {...form.register("tempo_estimado_minutos", numberFieldOptions)}
                  />
                </FormField>
                {!hide("especialidade") ? (
                <FormField label="Especialidade" htmlFor="especialidade">
                  <Input id="especialidade" {...form.register("especialidade")} />
                </FormField>
                ) : null}
                {!hide("equipe_ou_profissional") ? (
                <FormField
                  label="Profissional / equipe"
                  htmlFor="equipe_ou_profissional"
                >
                  <Input
                    id="equipe_ou_profissional"
                    {...form.register("equipe_ou_profissional")}
                  />
                </FormField>
                ) : null}
                <FormField label="Unidade de cobrança" htmlFor="unidade_cobranca">
                  <Input
                    id="unidade_cobranca"
                    {...form.register("unidade_cobranca")}
                    placeholder="UN, HORA…"
                  />
                </FormField>
              </>
            ) : null}

            <FormField
              label="Preço mínimo"
              htmlFor="preco_minimo"
              error={form.formState.errors.preco_minimo?.message}
            >
              <Input
                id="preco_minimo"
                type="number"
                step="0.01"
                min="0"
                {...form.register("preco_minimo", numberFieldOptions)}
              />
            </FormField>

            <FormField
              label="Margem alvo (0–1)"
              htmlFor="margem_alvo"
              error={form.formState.errors.margem_alvo?.message}
            >
              <Input
                id="margem_alvo"
                type="number"
                step="0.01"
                min="0"
                max="1"
                {...form.register("margem_alvo", numberFieldOptions)}
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
            description="Controle de quantidade, segurança e localização."
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

              <FormField label="Estoque máximo" htmlFor="estoque_maximo">
                <Input
                  id="estoque_maximo"
                  type="number"
                  step="0.001"
                  min="0"
                  {...form.register("estoque_maximo", numberFieldOptions)}
                />
              </FormField>

              <FormField label="Estoque de segurança" htmlFor="estoque_seguranca">
                <Input
                  id="estoque_seguranca"
                  type="number"
                  step="0.001"
                  min="0"
                  {...form.register("estoque_seguranca", numberFieldOptions)}
                />
              </FormField>

              <FormField label="Localização" htmlFor="localizacao">
                <Input
                  id="localizacao"
                  {...form.register("localizacao")}
                  placeholder="Corredor, prateleira, depósito"
                />
              </FormField>

              <FormField label="Controla estoque" htmlFor="controla_estoque">
                <Controller
                  control={form.control}
                  name="controla_estoque"
                  render={({ field }) => (
                    <NativeSelect
                      id="controla_estoque"
                      value={String(field.value)}
                      onChange={(e) => field.onChange(e.target.value === "true")}
                    >
                      <option value="true">Sim</option>
                      <option value="false">Não</option>
                    </NativeSelect>
                  )}
                />
              </FormField>
              {!hide("lote") ? (
              <FormField label="Controla lote" htmlFor="controla_lote">
                <Controller
                  control={form.control}
                  name="controla_lote"
                  render={({ field }) => (
                    <NativeSelect
                      id="controla_lote"
                      value={String(field.value)}
                      onChange={(e) => field.onChange(e.target.value === "true")}
                    >
                      <option value="false">Não</option>
                      <option value="true">Sim</option>
                    </NativeSelect>
                  )}
                />
              </FormField>
              ) : null}
              {!hide("serie") ? (
              <FormField label="Controla série" htmlFor="controla_serie">
                <Controller
                  control={form.control}
                  name="controla_serie"
                  render={({ field }) => (
                    <NativeSelect
                      id="controla_serie"
                      value={String(field.value)}
                      onChange={(e) => field.onChange(e.target.value === "true")}
                    >
                      <option value="false">Não</option>
                      <option value="true">Sim</option>
                    </NativeSelect>
                  )}
                />
              </FormField>
              ) : null}
              {!hide("validade") ? (
              <FormField label="Controla validade" htmlFor="controla_validade">
                <Controller
                  control={form.control}
                  name="controla_validade"
                  render={({ field }) => (
                    <NativeSelect
                      id="controla_validade"
                      value={String(field.value)}
                      onChange={(e) => field.onChange(e.target.value === "true")}
                    >
                      <option value="false">Não</option>
                      <option value="true">Sim</option>
                    </NativeSelect>
                  )}
                />
              </FormField>
              ) : null}
            </FormGrid>
          </FormSection>
        ) : null}

        <FormSection title="Fornecimento">
          <FormGrid>
            <FormField label="Fornecedor principal" htmlFor="fornecedor_principal">
              <Input
                id="fornecedor_principal"
                {...form.register("fornecedor_principal")}
              />
            </FormField>
            <FormField
              label="Fornecedor alternativo"
              htmlFor="fornecedor_alternativo"
            >
              <Input
                id="fornecedor_alternativo"
                {...form.register("fornecedor_alternativo")}
              />
            </FormField>
          </FormGrid>
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
