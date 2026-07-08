"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { CancelButton } from "@/components/ui/cancel-button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { FormField } from "@/components/ui/form-field";
import { FormGrid } from "@/components/ui/form-grid";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { SaveButton } from "@/components/ui/save-button";
import { Textarea } from "@/components/ui/textarea";
import { createMovimentacaoAction } from "@/lib/estoque/actions";
import {
  MOVIMENTACAO_ORIGEM_OPTIONS,
  MOVIMENTACAO_TIPO_OPTIONS,
} from "@/lib/estoque/constants";
import { formatQuantity, getQuantidadeLabel } from "@/lib/estoque/format";
import {
  movimentacaoFormSchema,
  type MovimentacaoFormInput,
  type MovimentacaoFormValues,
} from "@/lib/estoque/validations";

type ProdutoOption = {
  id: string;
  nome: string;
  sku: string | null;
  unidade_medida: string;
  estoque_atual: number;
};

type EstoqueFormProps = {
  tenantSlug: string;
  produtos: ProdutoOption[];
};

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const quantityFieldOptions = {
  setValueAs: (value: string | number) => {
    if (value === "" || value === null || value === undefined) return 0;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  },
};

export function EstoqueForm({ tenantSlug, produtos }: EstoqueFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<MovimentacaoFormInput, unknown, MovimentacaoFormValues>({
    resolver: zodResolver(movimentacaoFormSchema),
    defaultValues: {
      produto_id: "",
      tipo: "entrada",
      quantidade: 0,
      motivo: "",
      origem: "manual",
      observacoes: "",
    },
  });

  const produtoId = useWatch({ control: form.control, name: "produto_id" });
  const tipo = useWatch({ control: form.control, name: "tipo" });

  const produtoSelecionado = useMemo(
    () => produtos.find((produto) => produto.id === produtoId),
    [produtos, produtoId],
  );

  async function onSubmit(values: MovimentacaoFormValues) {
    setLoading(true);
    setError(null);

    const result = await createMovimentacaoAction(tenantSlug, values);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/${tenantSlug}/estoque/${result.id}?success=created`);
  }

  if (produtos.length === 0) {
    return (
      <FeedbackMessage variant="error">
        Nenhum produto com controle de estoque disponível. Cadastre produtos
        (exceto serviços) antes de registrar movimentações.
      </FeedbackMessage>
    );
  }

  return (
    <div className="relative">
      <LoadingOverlay loading={loading} label="Registrando..." />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}

        <FormSection
          title="Movimentação"
          description="Selecione o produto e informe o tipo de movimentação."
        >
          <FormGrid>
            <FormField
              label="Produto"
              htmlFor="produto_id"
              required
              error={form.formState.errors.produto_id?.message}
              className="md:col-span-2"
            >
              <select
                id="produto_id"
                {...form.register("produto_id")}
                className={selectClassName}
              >
                <option value="">Selecione um produto</option>
                {produtos.map((produto) => (
                  <option key={produto.id} value={produto.id}>
                    {produto.nome}
                    {produto.sku ? ` (${produto.sku})` : ""}
                    {" — "}
                    {formatQuantity(produto.estoque_atual, produto.unidade_medida)}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Tipo" htmlFor="tipo" required>
              <select
                id="tipo"
                {...form.register("tipo")}
                className={selectClassName}
              >
                {MOVIMENTACAO_TIPO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Origem" htmlFor="origem" required>
              <select
                id="origem"
                {...form.register("origem")}
                className={selectClassName}
              >
                {MOVIMENTACAO_ORIGEM_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label={getQuantidadeLabel(tipo)}
              htmlFor="quantidade"
              required
              error={form.formState.errors.quantidade?.message}
              hint={
                produtoSelecionado
                  ? `Estoque atual: ${formatQuantity(
                      produtoSelecionado.estoque_atual,
                      produtoSelecionado.unidade_medida,
                    )}`
                  : undefined
              }
            >
              <Input
                id="quantidade"
                type="number"
                step="0.001"
                min="0"
                {...form.register("quantidade", quantityFieldOptions)}
              />
            </FormField>

            <FormField label="Motivo" htmlFor="motivo" className="md:col-span-2">
              <Input
                id="motivo"
                {...form.register("motivo")}
                placeholder="Ex.: Compra fornecedor, inventário, correção"
              />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection title="Observações">
          <FormField label="Anotações" htmlFor="observacoes">
            <Textarea
              id="observacoes"
              rows={4}
              {...form.register("observacoes")}
              placeholder="Detalhes adicionais sobre a movimentação"
            />
          </FormField>
        </FormSection>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <CancelButton
            label="Cancelar"
            onClick={() => router.push(`/${tenantSlug}/estoque`)}
            disabled={loading}
          />
          <SaveButton loading={loading} loadingText="Registrando...">
            Registrar movimentação
          </SaveButton>
        </div>
      </form>
    </div>
  );
}
