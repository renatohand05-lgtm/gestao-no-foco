"use client";

import { useMemo, useState, useTransition } from "react";
import { useFormContext, useWatch } from "react-hook-form";

import { FeedbackMessage } from "@/components/ui/feedback-message";
import { FormField } from "@/components/ui/form-field";
import { FormGrid } from "@/components/ui/form-grid";
import { Input } from "@/components/ui/input";
import { gofControl } from "@/lib/design-system";
import {
  BENEFICIARIO_CADASTRO_TIPOS,
  BENEFICIARIO_TIPO_LABEL,
  BENEFICIARIO_TIPOS,
  isBeneficiarioCadastroTipo,
  type BeneficiarioCadastroTipo,
  type BeneficiarioTipo,
} from "@/lib/financeiro/beneficiario-types";
import { createFinanceiroBeneficiarioAction } from "@/lib/financeiro/beneficiario-actions";
import {
  resolveDespesaPreset,
  type DespesaPresetId,
} from "@/lib/financeiro/despesa-presets";
import { orderDespesaPresetsForSegment } from "@/lib/segments/finance-presets.ts";
import { suggestFormaPagamentoId } from "@/lib/financeiro/despesa-forma-pagamento";
import type { ContaPagarFormInput } from "@/lib/financeiro/validations";
import { getFornecedorAutofillAction } from "@/lib/master-data/actions";
import { mergeAutofillWithoutOverwrite } from "@/lib/master-data/master-data-suggestions";
import type { ContaPagarAutofillSuggestion } from "@/lib/master-data/master-data-types";
import type {
  BeneficiarioOption,
  EquipePayeeOption,
  MecanicoPayeeOption,
} from "@/lib/financeiro/beneficiario-service";
import type {
  CategoriaFinanceiraOption,
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
  segment?: string | null;
  disabled?: boolean;
  fornecedores: FornecedorOption[];
  beneficiarios: BeneficiarioOption[];
  mecanicos: MecanicoPayeeOption[];
  equipe: EquipePayeeOption[];
  categorias: CategoriaFinanceiraOption[];
  planoContas: PlanoContaOption[];
  formasPagamento?: FormaPagamentoOption[];
  onBeneficiariosChange?: (next: BeneficiarioOption[]) => void;
};

export function ContaPagarBeneficiarioFields({
  tenantSlug,
  segment,
  disabled = false,
  fornecedores,
  beneficiarios,
  mecanicos,
  equipe,
  categorias,
  planoContas,
  formasPagamento = [],
  onBeneficiariosChange,
}: Props) {
  const form = useFormContext<ContaPagarFormInput>();
  const [presetHint, setPresetHint] = useState<string | null>(null);
  const [lastSuggestedFormaId, setLastSuggestedFormaId] = useState<
    string | null
  >(null);
  const [autofillHint, setAutofillHint] = useState<{
    suggestion: ContaPagarAutofillSuggestion;
    applied: string[];
    skipped: string[];
  } | null>(null);
  const [autofillLoading, setAutofillLoading] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoDoc, setNovoDoc] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [benefLocal, setBenefLocal] = useState(beneficiarios);

  const tipo = (useWatch({ control: form.control, name: "beneficiario_tipo" }) ||
    "") as string;
  const fornecedorId = useWatch({
    control: form.control,
    name: "fornecedor_id",
  });
  const search = useWatch({
    control: form.control,
    name: "fornecedor_nome",
  });

  const filteredFornecedores = useMemo(() => {
    const q = String(search ?? "").trim().toLowerCase();
    if (!q || fornecedorId) return fornecedores;
    return fornecedores.filter(
      (f) =>
        f.nome.toLowerCase().includes(q) ||
        (f.documento ?? "").toLowerCase().includes(q),
    );
  }, [fornecedores, search, fornecedorId]);

  const filteredBenef = useMemo(() => {
    const list = benefLocal.filter((b) => !tipo || b.tipo === tipo);
    const q = String(search ?? "").trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (b) =>
        b.nome.toLowerCase().includes(q) ||
        (b.documento ?? "").toLowerCase().includes(q),
    );
  }, [benefLocal, tipo, search]);

  const filteredMecanicos = useMemo(() => {
    const q = String(search ?? "").trim().toLowerCase();
    if (!q) return mecanicos;
    return mecanicos.filter(
      (m) =>
        m.nome.toLowerCase().includes(q) ||
        (m.documento ?? "").toLowerCase().includes(q),
    );
  }, [mecanicos, search]);

  const filteredEquipe = useMemo(() => {
    const q = String(search ?? "").trim().toLowerCase();
    if (!q) return equipe;
    return equipe.filter(
      (m) =>
        m.nome.toLowerCase().includes(q) ||
        (m.email ?? "").toLowerCase().includes(q),
    );
  }, [equipe, search]);

  function clearEntityRefs() {
    form.setValue("fornecedor_id", "");
    form.setValue("beneficiario_id", "");
    form.setValue("mecanico_id", "");
    form.setValue("beneficiario_profile_id", "");
  }

  function applyPreset(presetId: DespesaPresetId) {
    const resolved = resolveDespesaPreset(presetId, categorias, planoContas);
    if (!resolved) return;
    form.setValue("despesa_preset_id", presetId);
    form.setValue("descricao", resolved.preset.descricaoSugerida);
    form.setValue(
      "beneficiario_tipo",
      resolved.preset.beneficiarioTipoSugerido,
    );
    clearEntityRefs();
    if (resolved.categoriaId) {
      form.setValue("categoria_financeira_id", resolved.categoriaId);
    }
    if (resolved.planoContaId) {
      form.setValue("plano_conta_id", resolved.planoContaId);
    }

    const suggestedFormaId = suggestFormaPagamentoId(
      formasPagamento,
      presetId,
    );
    const currentForma = String(form.getValues("forma_pagamento_id") ?? "");
    const canApplyForma =
      Boolean(suggestedFormaId) &&
      (!currentForma || currentForma === lastSuggestedFormaId);
    if (canApplyForma && suggestedFormaId) {
      form.setValue("forma_pagamento_id", suggestedFormaId, {
        shouldDirty: true,
      });
      setLastSuggestedFormaId(suggestedFormaId);
    } else if (!suggestedFormaId) {
      setLastSuggestedFormaId(null);
    }

    const formaHint = suggestedFormaId
      ? canApplyForma
        ? "Forma de pagamento sugerida (você pode alterar)."
        : "Forma sugerida disponível — mantida a seleção manual atual."
      : "Nenhuma forma cadastrada casa com a sugestão deste tipo — escolha manualmente.";

    setPresetHint(
      resolved.classificacaoPendente
        ? `Pendente de classificação — ${resolved.matchReason}. Configure categoria/plano manualmente. ${formaHint}`
        : `Classificação sugerida — ${resolved.matchReason}. ${formaHint}`,
    );
    setAutofillHint(null);
  }

  async function handleFornecedorChange(fornecedorIdNext: string) {
    form.setValue("fornecedor_id", fornecedorIdNext);
    form.setValue("beneficiario_tipo", "fornecedor");
    form.setValue("beneficiario_id", "");
    form.setValue("mecanico_id", "");
    form.setValue("beneficiario_profile_id", "");
    setAutofillHint(null);

    if (!fornecedorIdNext || disabled) return;
    const selected = fornecedores.find((f) => f.id === fornecedorIdNext);
    const nomeLivre = form.getValues("fornecedor_nome");
    if (selected && (!nomeLivre || !String(nomeLivre).trim())) {
      form.setValue("fornecedor_nome", selected.nome);
    }

    setAutofillLoading(true);
    const result = await getFornecedorAutofillAction(
      tenantSlug,
      fornecedorIdNext,
    );
    setAutofillLoading(false);
    if (!result.success || !result.suggestion) return;

    const suggestion = result.suggestion;
    if (suggestion.confidence === "low") {
      setAutofillHint({ suggestion, applied: [], skipped: [] });
      return;
    }
    const current = form.getValues() as Record<string, unknown>;
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

  function handleMecanicoChange(id: string) {
    form.setValue("mecanico_id", id);
    form.setValue("beneficiario_tipo", "mecanico");
    form.setValue("fornecedor_id", "");
    form.setValue("beneficiario_id", "");
    form.setValue("beneficiario_profile_id", "");
    const m = mecanicos.find((x) => x.id === id);
    if (m) {
      form.setValue("fornecedor_nome", m.nome);
      if (m.centroCustoId && !form.getValues("centro_custo_id")) {
        form.setValue("centro_custo_id", m.centroCustoId);
      }
    }
  }

  function handleEquipeChange(profileId: string) {
    form.setValue("beneficiario_profile_id", profileId);
    form.setValue("fornecedor_id", "");
    form.setValue("beneficiario_id", "");
    form.setValue("mecanico_id", "");
    const m = equipe.find((x) => x.profileId === profileId);
    if (m) form.setValue("fornecedor_nome", m.nome);
  }

  function handleBeneficiarioCadastroChange(id: string) {
    form.setValue("beneficiario_id", id);
    form.setValue("fornecedor_id", "");
    form.setValue("mecanico_id", "");
    form.setValue("beneficiario_profile_id", "");
    const b = benefLocal.find((x) => x.id === id);
    if (b) {
      form.setValue("fornecedor_nome", b.nome);
      form.setValue("beneficiario_tipo", b.tipo);
    }
  }

  function createBeneficiarioRapido() {
    setCreateError(null);
    const cadastroTipo: BeneficiarioCadastroTipo = isBeneficiarioCadastroTipo(
      tipo,
    )
      ? (tipo as BeneficiarioCadastroTipo)
      : "outro";
    startTransition(async () => {
      const res = await createFinanceiroBeneficiarioAction(tenantSlug, {
        nome: novoNome,
        tipo: cadastroTipo,
        documento: novoDoc || null,
      });
      if (!res.success || !res.item) {
        setCreateError(res.error ?? "Não foi possível cadastrar.");
        return;
      }
      const next = [...benefLocal, res.item].sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR"),
      );
      setBenefLocal(next);
      onBeneficiariosChange?.(next);
      form.setValue("beneficiario_tipo", res.item.tipo);
      form.setValue("beneficiario_id", res.item.id);
      form.setValue("fornecedor_nome", res.item.nome);
      form.setValue("fornecedor_id", "");
      setNovoNome("");
      setNovoDoc("");
    });
  }

  const showCadastroRapido = isBeneficiarioCadastroTipo(tipo) || tipo === "";

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">
          Lançamento rápido
        </p>
        <div className="flex flex-wrap gap-2">
          {orderDespesaPresetsForSegment(segment).map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={disabled}
              onClick={() => applyPreset(p.id)}
              className="rounded-md border border-border/70 bg-background px-2.5 py-1.5 text-left text-xs hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              {p.label}
            </button>
          ))}
        </div>
        {presetHint ? (
          <p className="mt-2 text-xs text-muted-foreground" role="status">
            {presetHint}
          </p>
        ) : null}
      </div>

      <FormGrid>
        <FormField label="Tipo de beneficiário" htmlFor="beneficiario_tipo">
          <select
            id="beneficiario_tipo"
            className={gofControl}
            disabled={disabled}
            value={tipo}
            onChange={(e) => {
              const next = e.target.value as BeneficiarioTipo | "";
              form.setValue("beneficiario_tipo", next);
              clearEntityRefs();
              setAutofillHint(null);
            }}
          >
            <option value="">Selecionar…</option>
            {BENEFICIARIO_TIPOS.map((t) => (
              <option key={t} value={t}>
                {BENEFICIARIO_TIPO_LABEL[t]}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Busca / nome do beneficiário"
          htmlFor="fornecedor_nome"
          error={form.formState.errors.fornecedor_nome?.message}
        >
          <Input
            id="fornecedor_nome"
            {...form.register("fornecedor_nome")}
            placeholder="Nome cadastrado ou lançamento pontual"
            disabled={disabled}
          />
        </FormField>

        {tipo === "fornecedor" || tipo === "" ? (
          <FormField
            label="Fornecedor cadastrado"
            htmlFor="fornecedor_id"
            error={form.formState.errors.fornecedor_id?.message}
          >
            <select
              id="fornecedor_id"
              className={gofControl}
              disabled={disabled}
              value={String(fornecedorId ?? "")}
              onChange={(e) => void handleFornecedorChange(e.target.value)}
            >
              <option value="">Sem vínculo / só nome livre</option>
              {filteredFornecedores.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                  {f.documento ? ` · ${f.documento}` : ""}
                </option>
              ))}
            </select>
          </FormField>
        ) : null}

        {tipo === "mecanico" ? (
          <FormField
            label="Mecânico"
            htmlFor="mecanico_id"
            error={form.formState.errors.mecanico_id?.message}
          >
            <select
              id="mecanico_id"
              className={gofControl}
              disabled={disabled}
              {...form.register("mecanico_id")}
              onChange={(e) => handleMecanicoChange(e.target.value)}
            >
              <option value="">Selecionar mecânico</option>
              {filteredMecanicos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                  {m.documento ? ` · ${m.documento}` : ""}
                </option>
              ))}
            </select>
            {mecanicos.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Nenhum mecânico ativo neste tenant — use nome livre.
              </p>
            ) : null}
          </FormField>
        ) : null}

        {tipo === "funcionario" || tipo === "vendedor" ? (
          <FormField
            label={tipo === "vendedor" ? "Vendedor / equipe" : "Funcionário / equipe"}
            htmlFor="beneficiario_profile_id"
            error={form.formState.errors.beneficiario_profile_id?.message}
          >
            <select
              id="beneficiario_profile_id"
              className={gofControl}
              disabled={disabled}
              {...form.register("beneficiario_profile_id")}
              onChange={(e) => handleEquipeChange(e.target.value)}
            >
              <option value="">Selecionar pessoa</option>
              {filteredEquipe.map((m) => (
                <option key={m.profileId} value={m.profileId}>
                  {m.nome}
                  {m.email ? ` · ${m.email}` : ""}
                </option>
              ))}
            </select>
            {equipe.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Lista de equipe indisponível ou vazia — use nome livre. Mecânicos
                têm tipo próprio.
              </p>
            ) : null}
          </FormField>
        ) : null}

        {isBeneficiarioCadastroTipo(tipo) ? (
          <FormField
            label="Beneficiário cadastrado"
            htmlFor="beneficiario_id"
            error={form.formState.errors.beneficiario_id?.message}
          >
            <select
              id="beneficiario_id"
              className={gofControl}
              disabled={disabled}
              {...form.register("beneficiario_id")}
              onChange={(e) => handleBeneficiarioCadastroChange(e.target.value)}
            >
              <option value="">Sem cadastro / só nome livre</option>
              {filteredBenef.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome}
                  {b.documento ? ` · ${b.documento}` : ""}
                </option>
              ))}
            </select>
          </FormField>
        ) : null}
      </FormGrid>

      {autofillLoading ? (
        <p className="text-sm text-muted-foreground">
          Carregando sugestões do fornecedor…
        </p>
      ) : null}

      {autofillHint ? (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
          <p className="font-medium">Sugestão do cadastro de fornecedor</p>
          <ul className="mt-1 list-inside list-disc text-xs opacity-90">
            {autofillHint.suggestion.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {showCadastroRapido && !disabled ? (
        <div className="rounded-md border border-dashed border-border/70 p-3">
          <p className="text-sm font-medium">+ Novo beneficiário</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Prestador, locador, concessionária, governo ou outro — reutilizável
            neste tenant. Não cria fornecedor de compras.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <Input
              aria-label="Nome do novo beneficiário"
              placeholder="Nome / razão social"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
            />
            <Input
              aria-label="Documento opcional"
              placeholder="CPF/CNPJ (opcional)"
              value={novoDoc}
              onChange={(e) => setNovoDoc(e.target.value)}
            />
            <button
              type="button"
              disabled={pending || novoNome.trim().length < 2}
              onClick={createBeneficiarioRapido}
              className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm hover:bg-muted/50 disabled:opacity-50"
            >
              {pending ? "Salvando…" : "Cadastrar e usar"}
            </button>
          </div>
          {!isBeneficiarioCadastroTipo(tipo) ? (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Tipos cadastráveis:{" "}
              {BENEFICIARIO_CADASTRO_TIPOS.map(
                (t) => BENEFICIARIO_TIPO_LABEL[t],
              ).join(", ")}
              . Se o tipo atual for outro, o cadastro será salvo como Outro ou
              selecione o tipo antes.
            </p>
          ) : null}
          {createError ? (
            <FeedbackMessage variant="error">{createError}</FeedbackMessage>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
