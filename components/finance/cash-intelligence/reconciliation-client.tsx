"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { ExecutiveBadge } from "@/components/executive/ExecutiveBadge";
import { ExecutiveEmptyState } from "@/components/executive";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  decideBankReconciliationMatch,
  listBankStatementLines,
  openBankReconciliationSession,
} from "@/lib/finance/cash-intelligence/cash-intelligence-actions";
import type { ReconciliationSession } from "@/lib/finance/reconciliation";
import type { StatementLineRecord } from "@/lib/finance/reconciliation";

type Props = {
  tenantSlug: string;
  bankAccountId: string | null;
  accounts: Array<{ id: string; name: string }>;
  initialLines: StatementLineRecord[];
  initialError?: string | null;
};

type LoadState = "loading" | "ready" | "error" | "empty";

function statusTone(
  status: string,
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "reconciled" || status === "auto_matched") return "success";
  if (
    status === "suggestion" ||
    status === "awaiting_confirmation" ||
    status === "suggested"
  ) {
    return "warning";
  }
  if (status === "divergent" || status === "unmatched") return "danger";
  return "neutral";
}

function resolveInitialState(
  lines: StatementLineRecord[],
  initialError?: string | null,
): LoadState {
  if (initialError) return "error";
  if (lines.length === 0) return "empty";
  return "ready";
}

export function ReconciliationClient({
  tenantSlug,
  bankAccountId: initialAccountId,
  accounts,
  initialLines,
  initialError = null,
}: Props) {
  const [accountId, setAccountId] = useState(
    initialAccountId ?? accounts[0]?.id ?? "",
  );
  const [lines, setLines] = useState<StatementLineRecord[]>(initialLines);
  const [session, setSession] = useState<ReconciliationSession | null>(null);
  const [loadState, setLoadState] = useState<LoadState>(
    resolveInitialState(initialLines, initialError),
  );
  const [error, setError] = useState<string | null>(initialError);
  const [pending, startTransition] = useTransition();

  function reloadLines(nextAccountId: string) {
    setLoadState("loading");
    setError(null);
    setSession(null);
    startTransition(async () => {
      if (!nextAccountId) {
        setLines([]);
        setLoadState("empty");
        return;
      }
      const res = await listBankStatementLines(tenantSlug, {
        bankAccountId: nextAccountId,
      });
      if (!res.success) {
        setError(res.error);
        setLoadState("error");
        setLines([]);
        return;
      }
      setLines(res.lines);
      setLoadState(res.lines.length === 0 ? "empty" : "ready");
    });
  }

  function openSession() {
    if (!accountId) {
      setError("Selecione uma conta bancária.");
      return;
    }
    startTransition(async () => {
      const res = await openBankReconciliationSession(tenantSlug, {
        bankAccountId: accountId,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setSession(res.session);
      setError(null);
      const linesRes = await listBankStatementLines(tenantSlug, {
        bankAccountId: accountId,
      });
      if (linesRes.success) {
        setLines(linesRes.lines);
        setLoadState(linesRes.lines.length === 0 ? "empty" : "ready");
      }
    });
  }

  function decide(
    matchId: string,
    decision: "accepted" | "rejected" | "ignored",
  ) {
    if (!session) return;
    startTransition(async () => {
      const res = await decideBankReconciliationMatch(tenantSlug, {
        sessionId: session.id,
        matchId,
        decision,
        justification:
          decision === "accepted"
            ? "Confirmado pelo utilizador"
            : decision === "ignored"
              ? "Ignorado justificadamente pelo utilizador"
              : "Rejeitado pelo utilizador",
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setSession({
        ...session,
        matches: session.matches.map((m) =>
          m.id === matchId ? res.match : m,
        ),
      });
      const linesRes = await listBankStatementLines(tenantSlug, {
        bankAccountId: accountId,
      });
      if (linesRes.success) {
        setLines(linesRes.lines);
        setLoadState(linesRes.lines.length === 0 ? "empty" : "ready");
      }
    });
  }

  return (
    <div className="space-y-4" data-bank-reconciliation>
      <p className="text-sm text-muted-foreground">
        Dados reais do Supabase (`bank_statement_lines` / matches). Importe
        extratos CSV/XLS via Importar Dados; depois abra a sessão de conciliação.
      </p>

      {error ? (
        <p
          className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <label className="block max-w-md space-y-1 text-sm">
        <span className="text-muted-foreground">Conta bancária</span>
        <select
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={accountId}
          onChange={(e) => {
            const next = e.target.value;
            setAccountId(next);
            reloadLines(next);
          }}
          aria-label="Conta bancária para conciliação"
        >
          {accounts.length === 0 ? (
            <option value="">Sem contas</option>
          ) : (
            accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))
          )}
        </select>
      </label>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={pending || !accountId}
          onClick={openSession}
        >
          Abrir sessão de conciliação
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending || !accountId}
          onClick={() => reloadLines(accountId)}
        >
          Atualizar linhas
        </Button>
      </div>

      <section aria-label="Linhas de extrato" className="space-y-2">
        <h2 className="text-sm font-semibold">Linhas de extrato</h2>
        {loadState === "loading" ? (
          <div className="space-y-2" aria-busy="true">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : null}
        {loadState === "error" ? (
          <p className="text-sm text-red-700">Falha ao carregar linhas.</p>
        ) : null}
        {loadState === "empty" ? (
          <ExecutiveEmptyState
            title="Sem linhas de extrato"
            description="Importe um extrato CSV/XLS/XLSX em Importar Dados. Nenhum dado fictício é exibido."
            action={{
              label: "Ir para Importar",
              href: `/${tenantSlug}/financeiro/importar`,
            }}
          />
        ) : null}
        {loadState === "ready" ? (
          <ul className="space-y-2">
            {lines.map((line) => (
              <li
                key={line.id}
                className="rounded-lg border border-border/60 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <ExecutiveBadge
                    tone={statusTone(line.derivedStatus ?? "pending")}
                  >
                    {line.derivedStatus ?? "pending"}
                  </ExecutiveBadge>
                  <span className="tabular-nums font-medium">
                    {line.amount.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {line.date}
                  </span>
                </div>
                <p className="mt-1">{line.description}</p>
                <p className="text-[11px] text-muted-foreground">
                  Ext: {line.externalId ?? "—"}
                  {line.importRunId
                    ? ` · run ${line.importRunId.slice(0, 8)}…`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {session ? (
        <section aria-label="Sugestões da sessão" className="space-y-2">
          <h2 className="text-sm font-semibold">
            Sessão {session.id.slice(0, 8)}… · {session.matches.length} match(es)
          </h2>
          <ul className="space-y-2">
            {session.matches.map((m) => (
              <li
                key={m.id}
                className="rounded-lg border border-border/60 px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap gap-2">
                  <ExecutiveBadge tone={statusTone(m.status)}>
                    {m.status}
                  </ExecutiveBadge>
                  <ExecutiveBadge tone="neutral" variant="outline">
                    {Math.round(m.confidence * 100)}%
                  </ExecutiveBadge>
                  <ExecutiveBadge tone="neutral">{m.decision}</ExecutiveBadge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Critérios: {m.criteria.join(", ") || "—"}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending || m.decision !== "pending"}
                    onClick={() => decide(m.id, "accepted")}
                  >
                    Aceitar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending || m.decision !== "pending"}
                    onClick={() => decide(m.id, "rejected")}
                  >
                    Rejeitar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={pending || m.decision !== "pending"}
                    onClick={() => decide(m.id, "ignored")}
                  >
                    Ignorar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Extratos:{" "}
        <Link
          className="underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          href={`/${tenantSlug}/financeiro/importar`}
        >
          Importar Dados
        </Link>
        .
      </p>
    </div>
  );
}
