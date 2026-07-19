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
import {
  createDespesaRecorrenteAction,
  updateDespesaRecorrenteAction,
} from "@/lib/financeiro/actions";
import { todayISO } from "@/lib/financeiro/conta-pagar-utils";
import {
  despesaRecorrenteFormSchema,
  type DespesaRecorrenteFormInput,
  type DespesaRecorrenteFormValues,
} from "@/lib/financeiro/validations";
import type { DespesaRecorrente } from "@/lib/financeiro/despesa-recorrente-service";
import type {
  CategoriaFinanceiraOption,
  CentroCustoOption,
  FormaPagamentoOption,
  FornecedorOption,
  PlanoContaOption,
} from "@/types/contas-pagar";

type Props = {
  tenantSlug: string;
  mode: "create" | "edit";
  item?: DespesaRecorrente;
  fornecedores: FornecedorOption[];
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

function previewCompetencias(
  iniciaEm: string,
  max: number | null | undefined,
  terminaEm: string | null | undefined,
  count = 6,
): string[] {
  if (!iniciaEm || iniciaEm.length < 7) return [];
  const out: string[] = [];
  let [y, m] = iniciaEm.slice(0, 7).split("-").map(Number);
  for (let i = 0; i < count; i++) {
    const comp = `${y}-${String(m).padStart(2, "0")}-01`;
    if (terminaEm && comp > terminaEm) break;
    if (max != null && i >= max) break;
    out.push(comp.slice(0, 7));
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export function DespesaRecorrenteForm({
  tenantSlug,
  mode,
  item,
  fornecedores,
  formasPagamento,
  categorias,
  centrosCusto,
  planoContas,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<
    DespesaRecorrenteFormInput,
    unknown,
    DespesaRecorrenteFormValues
  >({
    resolver: zodResolver(despesaRecorrenteFormSchema),
    defaultValues: item
      ? {
          descricao: item.descricao,
          fornecedor_id: item.fornecedor_id ?? "",
          fornecedor_nome: item.fornecedor_nome ?? "",
          forma_pagamento_id: item.forma_pagamento_id ?? "",
          categoria_financeira_id: item.categoria_financeira_id ?? "",
          centro_custo_id: item.centro_custo_id ?? "",
          plano_conta_id: item.plano_conta_id ?? "",
          valor: Number(item.valor),
          dia_vencimento: item.dia_vencimento,
          inicia_em: item.inicia_em,
          termina_em: item.termina_em ?? "",
          max_ocorrencias: item.max_ocorrencias,
          observacoes: item.observacoes ?? "",
        }
      : {
          descricao: "",
          fornecedor_id: "",
          fornecedor_nome: "",
          forma_pagamento_id: "",
          categoria_financeira_id: "",
          centro_custo_id: "",
          plano_conta_id: "",
          valor: 0,
          dia_vencimento: 10,
          inicia_em: todayISO(),
          termina_em: "",
          max_ocorrencias: undefined,
          observacoes: "",
        },
  });

  const iniciaEm = useWatch({ control: form.control, name: "inicia_em" });
  const terminaEm = useWatch({ control: form.control, name: "termina_em" });
  const maxOcorr = useWatch({ control: form.control, name: "max_ocorrencias" });
  const proximas = useMemo(
    () => previewCompetencias(iniciaEm ?? "", maxOcorr, terminaEm || null),
    [iniciaEm, maxOcorr, terminaEm],
  );

  async function onSubmit(values: DespesaRecorrenteFormValues) {
    setLoading(true);
    setError(null);
    const result =
      mode === "create"
        ? await createDespesaRecorrenteAction(tenantSlug, values)
        : await updateDespesaRecorrenteAction(tenantSlug, item!.id, values);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(
      `/${tenantSlug}/financeiro/despesas-recorrentes/${result.id}?success=${mode === "create" ? "created" : "updated"}`,
    );
  }

  return (
    <div className="relative">
      <LoadingOverlay loading={loading} label="Salvando..." />
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}

        <FormSection
          title="Série mensal"
          description="Gera Contas a Pagar por competência. Não gera movimentação bancária."
        >
          <FormGrid>
            <FormField
              label="Descrição"
              htmlFor="descricao"
              required
              error={form.formState.errors.descricao?.message}
            >
              <Input id="descricao" {...form.register("descricao")} />
            </FormField>

            <FormField label="Fornecedor" htmlFor="fornecedor_id">
              <select
                id="fornecedor_id"
                {...form.register("fornecedor_id")}
                className={selectClassName}
              >
                <option value="">Sem vínculo</option>
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Nome livre" htmlFor="fornecedor_nome">
              <Input id="fornecedor_nome" {...form.register("fornecedor_nome")} />
            </FormField>

            <FormField
              label="Categoria"
              htmlFor="categoria_financeira_id"
              required
            >
              <select
                id="categoria_financeira_id"
                {...form.register("categoria_financeira_id")}
                className={selectClassName}
              >
                <option value="">Selecione</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Centro de custo" htmlFor="centro_custo_id" required>
              <select
                id="centro_custo_id"
                {...form.register("centro_custo_id")}
                className={selectClassName}
              >
                <option value="">Selecione</option>
                {centrosCusto.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} · {c.nome}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Plano de contas" htmlFor="plano_conta_id" required>
              <select
                id="plano_conta_id"
                {...form.register("plano_conta_id")}
                className={selectClassName}
              >
                <option value="">Selecione</option>
                {planoContas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.codigo} · {c.nome}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Forma de pagamento" htmlFor="forma_pagamento_id">
              <select
                id="forma_pagamento_id"
                {...form.register("forma_pagamento_id")}
                className={selectClassName}
              >
                <option value="">Não informada</option>
                {formasPagamento.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Valor" htmlFor="valor" required>
              <Input
                id="valor"
                type="number"
                step="0.01"
                {...form.register("valor", numberFieldOptions)}
              />
            </FormField>

            <FormField label="Dia de vencimento" htmlFor="dia_vencimento" required>
              <Input
                id="dia_vencimento"
                type="number"
                min={1}
                max={28}
                {...form.register("dia_vencimento", numberFieldOptions)}
              />
            </FormField>

            <FormField label="Inicia em" htmlFor="inicia_em" required>
              <Input id="inicia_em" type="date" {...form.register("inicia_em")} />
            </FormField>

            <FormField label="Termina em" htmlFor="termina_em">
              <Input
                id="termina_em"
                type="date"
                {...form.register("termina_em")}
              />
            </FormField>

            <FormField label="Máx. ocorrências" htmlFor="max_ocorrencias">
              <Input
                id="max_ocorrencias"
                type="number"
                min={1}
                {...form.register("max_ocorrencias", {
                  setValueAs: (v) => {
                    if (v === "" || v == null) return null;
                    const n = Number(v);
                    return Number.isNaN(n) ? null : n;
                  },
                })}
              />
            </FormField>

            <FormField
              label="Observações"
              htmlFor="observacoes"
              className="sm:col-span-2"
            >
              <Textarea id="observacoes" rows={3} {...form.register("observacoes")} />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection title="Próximas competências (prévia)">
          {proximas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem prévia.</p>
          ) : (
            <p className="text-sm tabular-nums text-muted-foreground">
              {proximas.join(" · ")}
            </p>
          )}
        </FormSection>

        <div className="flex flex-wrap gap-3">
          <CancelButton
            type="button"
            onClick={() =>
              router.push(`/${tenantSlug}/financeiro/despesas-recorrentes`)
            }
          />
          <SaveButton type="submit" loading={loading} />
        </div>
      </form>
    </div>
  );
}
