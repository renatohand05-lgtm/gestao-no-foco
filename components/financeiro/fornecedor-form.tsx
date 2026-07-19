"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
  checkFornecedorDuplicatesAction,
  createFornecedorAction,
  updateFornecedorAction,
} from "@/lib/master-data/actions";
import type {
  FornecedorDetail,
  FornecedorFrequencia,
  FornecedorInput,
  TipoPessoa,
} from "@/types/fornecedores";

type Option = { id: string; label: string };

type Props = {
  tenantSlug: string;
  mode: "create" | "edit";
  item?: FornecedorDetail;
  categorias: Option[];
  planos: Option[];
  centros: Option[];
  formas: Option[];
  contasBancarias: Option[];
};

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function FornecedorForm({
  tenantSlug,
  mode,
  item,
  categorias,
  planos,
  centros,
  formas,
  contasBancarias,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [values, setValues] = useState<FornecedorInput>({
    nome: item?.nome ?? "",
    nome_fantasia: item?.nome_fantasia ?? "",
    tipo_pessoa: (item?.tipo_pessoa as TipoPessoa | null) ?? "pj",
    documento: item?.documento ?? "",
    email: item?.email ?? "",
    telefone: item?.telefone ?? "",
    cep: item?.cep ?? "",
    rua: item?.rua ?? "",
    numero: item?.numero ?? "",
    complemento: item?.complemento ?? "",
    bairro: item?.bairro ?? "",
    cidade: item?.cidade ?? "",
    estado: item?.estado ?? "",
    categoria_financeira_id: item?.categoria_financeira_id ?? "",
    plano_conta_id: item?.plano_conta_id ?? "",
    centro_custo_id: item?.centro_custo_id ?? "",
    forma_pagamento_id: item?.forma_pagamento_id ?? "",
    conta_bancaria_id: item?.conta_bancaria_id ?? "",
    prazo_medio_dias: item?.prazo_medio_dias ?? null,
    recorrente: item?.recorrente ?? false,
    frequencia: (item?.frequencia as FornecedorFrequencia | null) ?? null,
    observacoes: item?.observacoes ?? "",
    ativo: item?.ativo ?? true,
  });

  function setField<K extends keyof FornecedorInput>(
    key: K,
    value: FornecedorInput[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setWarning(null);

    const dup = await checkFornecedorDuplicatesAction(tenantSlug, {
      excludeId: item?.id,
      documento: values.documento,
      nome: values.nome,
      nomeFantasia: values.nome_fantasia,
      email: values.email,
    });

    if (dup.success && dup.result.hasDuplicates) {
      setWarning(
        `Possível duplicidade: ${dup.result.matches
          .slice(0, 3)
          .map((m) => `${m.label} (${m.matchedOn.join(", ")})`)
          .join("; ")}. O salvamento será bloqueado até ajustar.`,
      );
      setLoading(false);
      return;
    }

    const payload: FornecedorInput = {
      ...values,
      categoria_financeira_id: values.categoria_financeira_id || null,
      plano_conta_id: values.plano_conta_id || null,
      centro_custo_id: values.centro_custo_id || null,
      forma_pagamento_id: values.forma_pagamento_id || null,
      conta_bancaria_id: values.conta_bancaria_id || null,
    };

    const result =
      mode === "create"
        ? await createFornecedorAction(tenantSlug, payload)
        : await updateFornecedorAction(tenantSlug, item!.id, payload);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(
      `/${tenantSlug}/financeiro/fornecedores/${result.id}?success=${mode === "create" ? "created" : "updated"}`,
    );
  }

  return (
    <div className="relative">
      <LoadingOverlay loading={loading} label="Salvando..." />
      <form onSubmit={onSubmit} className="space-y-6">
        {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
        {warning ? (
          <FeedbackMessage variant="error">{warning}</FeedbackMessage>
        ) : null}

        <FormSection title="Identificação">
          <FormGrid>
            <FormField label="Razão social / nome" htmlFor="nome" required>
              <Input
                id="nome"
                value={values.nome}
                onChange={(e) => setField("nome", e.target.value)}
                required
              />
            </FormField>
            <FormField label="Nome fantasia" htmlFor="nome_fantasia">
              <Input
                id="nome_fantasia"
                value={values.nome_fantasia ?? ""}
                onChange={(e) => setField("nome_fantasia", e.target.value)}
              />
            </FormField>
            <FormField label="Tipo" htmlFor="tipo_pessoa">
              <select
                id="tipo_pessoa"
                className={selectClassName}
                value={values.tipo_pessoa ?? ""}
                onChange={(e) =>
                  setField("tipo_pessoa", (e.target.value || null) as TipoPessoa)
                }
              >
                <option value="pj">Pessoa jurídica</option>
                <option value="pf">Pessoa física</option>
              </select>
            </FormField>
            <FormField label="CPF/CNPJ" htmlFor="documento">
              <Input
                id="documento"
                value={values.documento ?? ""}
                onChange={(e) => setField("documento", e.target.value)}
              />
            </FormField>
            <FormField label="E-mail" htmlFor="email">
              <Input
                id="email"
                type="email"
                value={values.email ?? ""}
                onChange={(e) => setField("email", e.target.value)}
              />
            </FormField>
            <FormField label="Telefone" htmlFor="telefone">
              <Input
                id="telefone"
                value={values.telefone ?? ""}
                onChange={(e) => setField("telefone", e.target.value)}
              />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection title="Endereço">
          <FormGrid>
            <FormField label="CEP" htmlFor="cep">
              <Input
                id="cep"
                value={values.cep ?? ""}
                onChange={(e) => setField("cep", e.target.value)}
              />
            </FormField>
            <FormField label="Rua" htmlFor="rua">
              <Input
                id="rua"
                value={values.rua ?? ""}
                onChange={(e) => setField("rua", e.target.value)}
              />
            </FormField>
            <FormField label="Número" htmlFor="numero">
              <Input
                id="numero"
                value={values.numero ?? ""}
                onChange={(e) => setField("numero", e.target.value)}
              />
            </FormField>
            <FormField label="Complemento" htmlFor="complemento">
              <Input
                id="complemento"
                value={values.complemento ?? ""}
                onChange={(e) => setField("complemento", e.target.value)}
              />
            </FormField>
            <FormField label="Bairro" htmlFor="bairro">
              <Input
                id="bairro"
                value={values.bairro ?? ""}
                onChange={(e) => setField("bairro", e.target.value)}
              />
            </FormField>
            <FormField label="Cidade" htmlFor="cidade">
              <Input
                id="cidade"
                value={values.cidade ?? ""}
                onChange={(e) => setField("cidade", e.target.value)}
              />
            </FormField>
            <FormField label="UF" htmlFor="estado">
              <Input
                id="estado"
                maxLength={2}
                value={values.estado ?? ""}
                onChange={(e) => setField("estado", e.target.value)}
              />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection
          title="Padrões financeiros (autopreenchimento)"
          description="Usados como sugestão em Contas a Pagar — não sobrescrevem valores já preenchidos."
        >
          <FormGrid>
            <FormField label="Categoria padrão" htmlFor="categoria_financeira_id">
              <select
                id="categoria_financeira_id"
                className={selectClassName}
                value={values.categoria_financeira_id ?? ""}
                onChange={(e) =>
                  setField("categoria_financeira_id", e.target.value)
                }
              >
                <option value="">Não definida</option>
                {categorias.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Plano de contas padrão" htmlFor="plano_conta_id">
              <select
                id="plano_conta_id"
                className={selectClassName}
                value={values.plano_conta_id ?? ""}
                onChange={(e) => setField("plano_conta_id", e.target.value)}
              >
                <option value="">Não definido</option>
                {planos.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Centro de custo padrão" htmlFor="centro_custo_id">
              <select
                id="centro_custo_id"
                className={selectClassName}
                value={values.centro_custo_id ?? ""}
                onChange={(e) => setField("centro_custo_id", e.target.value)}
              >
                <option value="">Não definido</option>
                {centros.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Forma de pagamento" htmlFor="forma_pagamento_id">
              <select
                id="forma_pagamento_id"
                className={selectClassName}
                value={values.forma_pagamento_id ?? ""}
                onChange={(e) => setField("forma_pagamento_id", e.target.value)}
              >
                <option value="">Não definida</option>
                {formas.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Conta bancária padrão" htmlFor="conta_bancaria_id">
              <select
                id="conta_bancaria_id"
                className={selectClassName}
                value={values.conta_bancaria_id ?? ""}
                onChange={(e) => setField("conta_bancaria_id", e.target.value)}
              >
                <option value="">Não definida</option>
                {contasBancarias.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Prazo médio (dias)" htmlFor="prazo_medio_dias">
              <Input
                id="prazo_medio_dias"
                type="number"
                min={0}
                value={values.prazo_medio_dias ?? ""}
                onChange={(e) =>
                  setField(
                    "prazo_medio_dias",
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
              />
            </FormField>
            <FormField label="Recorrente" htmlFor="recorrente">
              <select
                id="recorrente"
                className={selectClassName}
                value={String(values.recorrente)}
                onChange={(e) =>
                  setField("recorrente", e.target.value === "true")
                }
              >
                <option value="false">Não</option>
                <option value="true">Sim</option>
              </select>
            </FormField>
            <FormField label="Frequência" htmlFor="frequencia">
              <select
                id="frequencia"
                className={selectClassName}
                value={values.frequencia ?? ""}
                onChange={(e) =>
                  setField(
                    "frequencia",
                    (e.target.value || null) as FornecedorFrequencia | null,
                  )
                }
              >
                <option value="">—</option>
                <option value="mensal">Mensal</option>
                <option value="bimestral">Bimestral</option>
                <option value="trimestral">Trimestral</option>
                <option value="semestral">Semestral</option>
                <option value="anual">Anual</option>
                <option value="semanal">Semanal</option>
              </select>
            </FormField>
            <FormField label="Status" htmlFor="ativo">
              <select
                id="ativo"
                className={selectClassName}
                value={String(values.ativo)}
                onChange={(e) => setField("ativo", e.target.value === "true")}
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </FormField>
            <FormField
              label="Observações"
              htmlFor="observacoes"
              className="sm:col-span-2"
            >
              <Textarea
                id="observacoes"
                rows={3}
                value={values.observacoes ?? ""}
                onChange={(e) => setField("observacoes", e.target.value)}
              />
            </FormField>
          </FormGrid>
        </FormSection>

        <div className="flex flex-wrap gap-3">
          <CancelButton
            type="button"
            onClick={() =>
              router.push(`/${tenantSlug}/financeiro/fornecedores`)
            }
          />
          <SaveButton type="submit" loading={loading} />
        </div>
      </form>
    </div>
  );
}
