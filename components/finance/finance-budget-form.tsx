"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  createFinanceBudgetAction,
  updateFinanceBudgetAction,
} from "@/lib/finance/budget/actions";
import { cn } from "@/lib/utils";

type LineDraft = {
  mes: number;
  natureza: "receita" | "custo" | "despesa" | "investimento" | "divida" | "caixa";
  valor_orcado: number;
  justificativa: string;
};

type Props = {
  tenantSlug: string;
  mode: "create" | "edit";
  budgetId?: string;
  initial?: {
    nome: string;
    ano: number;
    observacao: string;
    lines: LineDraft[];
  };
};

const emptyLine = (): LineDraft => ({
  mes: 1,
  natureza: "despesa",
  valor_orcado: 0,
  justificativa: "",
});

export function FinanceBudgetForm({
  tenantSlug,
  mode,
  budgetId,
  initial,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [ano, setAno] = useState(initial?.ano ?? new Date().getFullYear());
  const [observacao, setObservacao] = useState(initial?.observacao ?? "");
  const [lines, setLines] = useState<LineDraft[]>(
    initial?.lines?.length ? initial.lines : [emptyLine()],
  );

  function submit() {
    setError(null);
    startTransition(async () => {
      const payload = {
        nome,
        ano,
        observacao,
        lines: lines.filter((l) => l.valor_orcado > 0 || l.justificativa),
      };
      const res =
        mode === "create"
          ? await createFinanceBudgetAction(tenantSlug, payload)
          : await updateFinanceBudgetAction(tenantSlug, budgetId!, payload);
      if (!res.success) {
        setError(res.error ?? "Falha ao salvar");
        return;
      }
      router.push(`/${tenantSlug}/financeiro/orcamento/${res.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4" data-phase28="budget-form">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-muted-foreground">Nome</span>
          <input
            className="mt-1 w-full rounded-md border bg-background px-3 py-2"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            aria-label="Nome do orçamento"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Ano</span>
          <input
            type="number"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2"
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            aria-label="Ano do orçamento"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-muted-foreground">Observações</span>
        <textarea
          className="mt-1 w-full rounded-md border bg-background px-3 py-2"
          rows={2}
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />
      </label>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Linhas orçadas</h3>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
          >
            Adicionar linha
          </button>
        </div>
        {lines.map((line, idx) => (
          <div
            key={idx}
            className="grid gap-2 rounded-lg border p-2 sm:grid-cols-4"
          >
            <label className="text-xs">
              Mês
              <input
                type="number"
                min={1}
                max={12}
                className="mt-1 w-full rounded border bg-background px-2 py-1"
                value={line.mes}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setLines((prev) =>
                    prev.map((l, i) => (i === idx ? { ...l, mes: v } : l)),
                  );
                }}
              />
            </label>
            <label className="text-xs">
              Natureza
              <select
                className="mt-1 w-full rounded border bg-background px-2 py-1"
                value={line.natureza}
                onChange={(e) => {
                  const v = e.target.value as LineDraft["natureza"];
                  setLines((prev) =>
                    prev.map((l, i) => (i === idx ? { ...l, natureza: v } : l)),
                  );
                }}
              >
                <option value="receita">Receita</option>
                <option value="custo">Custo</option>
                <option value="despesa">Despesa</option>
                <option value="investimento">Investimento</option>
                <option value="divida">Dívida</option>
                <option value="caixa">Caixa</option>
              </select>
            </label>
            <label className="text-xs">
              Valor orçado
              <input
                type="number"
                min={0}
                step="0.01"
                className="mt-1 w-full rounded border bg-background px-2 py-1"
                value={line.valor_orcado}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setLines((prev) =>
                    prev.map((l, i) =>
                      i === idx ? { ...l, valor_orcado: v } : l,
                    ),
                  );
                }}
              />
            </label>
            <label className="text-xs">
              Justificativa
              <input
                className="mt-1 w-full rounded border bg-background px-2 py-1"
                value={line.justificativa}
                onChange={(e) => {
                  const v = e.target.value;
                  setLines((prev) =>
                    prev.map((l, i) =>
                      i === idx ? { ...l, justificativa: v } : l,
                    ),
                  );
                }}
              />
            </label>
          </div>
        ))}
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={pending}
        className={cn(buttonVariants())}
        onClick={submit}
      >
        {pending ? "Salvando…" : mode === "create" ? "Criar orçamento" : "Salvar"}
      </button>
    </div>
  );
}
