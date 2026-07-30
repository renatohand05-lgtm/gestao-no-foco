"use client";

import {
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";

import { TransferSummary } from "@/components/finance/transfer-summary";
import { transferBetweenAccounts } from "@/lib/finance/actions";
import type { BankAccount, TreasuryTransferResult } from "@/lib/finance";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `xfer_${crypto.randomUUID()}`;
  }
  return `xfer_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function todayLocalDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function subscribeNoop() {
  return () => {};
}

type Props = {
  tenantSlug: string;
  accounts: BankAccount[];
  defaultFromAccountId?: string;
  defaultToAccountId?: string;
  onDone?: (result: TreasuryTransferResult) => void;
  className?: string;
};

export function TransferForm({
  tenantSlug,
  accounts,
  defaultFromAccountId,
  defaultToAccountId,
  onDone,
  className,
}: Props) {
  const formId = useId();
  const active = accounts.filter((a) => a.status === "active");
  const [fromAccountId, setFrom] = useState(
    defaultFromAccountId ?? active[0]?.id ?? "",
  );
  const [toAccountId, setTo] = useState(
    defaultToAccountId ?? active.find((a) => a.id !== fromAccountId)?.id ?? "",
  );
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("Transferência interna");
  const clientToday = useSyncExternalStore(
    subscribeNoop,
    todayLocalDate,
    () => "",
  );
  const [movementDateOverride, setDate] = useState<string | null>(null);
  const movementDate = movementDateOverride ?? clientToday;
  const idempotencyRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TreasuryTransferResult | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = Number(amount.replace(",", "."));
    if (!idempotencyRef.current) {
      idempotencyRef.current = newIdempotencyKey();
    }
    const idempotencyKey = idempotencyRef.current;
    startTransition(async () => {
      const res = await transferBetweenAccounts(tenantSlug, {
        fromAccountId,
        toAccountId,
        amount: value,
        movementDate,
        description,
        idempotencyKey,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      idempotencyRef.current = null;
      setResult(res.transfer);
      onDone?.(res.transfer);
    });
  }

  return (
    <form
      data-transfer-form
      id={formId}
      onSubmit={submit}
      className={cn("space-y-3", className)}
    >
      <p className={gofTypography.title}>Transferir entre contas</p>

      <label className="block space-y-1 text-sm">
        <span className="text-muted-foreground">Origem</span>
        <select
          required
          className="w-full rounded-md border border-input bg-transparent px-3 py-2"
          value={fromAccountId}
          onChange={(e) => setFrom(e.target.value)}
        >
          {active.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.currentBalance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1 text-sm">
        <span className="text-muted-foreground">Destino</span>
        <select
          required
          className="w-full rounded-md border border-input bg-transparent px-3 py-2"
          value={toAccountId}
          onChange={(e) => setTo(e.target.value)}
        >
          {active.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Valor</span>
          <input
            required
            inputMode="decimal"
            className="w-full rounded-md border border-input bg-transparent px-3 py-2"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Data</span>
          <input
            required
            type="date"
            className="w-full rounded-md border border-input bg-transparent px-3 py-2"
            value={movementDate}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="text-muted-foreground">Descrição</span>
        <input
          required
          className="w-full rounded-md border border-input bg-transparent px-3 py-2"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      {error ? (
        <p className="rounded-md border border-red-500/40 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {result ? <TransferSummary result={result} /> : null}

      <button
        type="submit"
        disabled={pending || !movementDate}
        className="inline-flex h-9 items-center rounded-md bg-[var(--brand-blue)] px-4 text-sm text-white disabled:opacity-60"
      >
        {pending ? "Transferindo…" : "Confirmar transferência"}
      </button>
    </form>
  );
}
