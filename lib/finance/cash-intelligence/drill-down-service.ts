/**
 * Sprint 22.6.2 — Drill-down Indicador → período → conta → lançamento.
 */

import type { BankAccount, CashMovement } from "../shared/types.ts";
import type {
  CashFlowLine,
  DrillDownNode,
  OpenTitleSnapshot,
} from "./types.ts";
import { toDateOnly } from "./date-utils.ts";

export function buildDrillDown(input: {
  indicatorKey: string;
  indicatorLabel: string;
  periodFrom: string;
  periodTo: string;
  accounts: BankAccount[];
  lines: CashFlowLine[];
  movements?: CashMovement[];
  titles?: OpenTitleSnapshot[];
}): DrillDownNode {
  const lines = input.lines.filter(
    (l) =>
      l.date >= toDateOnly(input.periodFrom) &&
      l.date <= toDateOnly(input.periodTo) &&
      l.status !== "transfer",
  );

  const byAccount = new Map<string, CashFlowLine[]>();
  for (const l of lines) {
    const key = l.bankAccountId ?? "sem-conta";
    const arr = byAccount.get(key) ?? [];
    arr.push(l);
    byAccount.set(key, arr);
  }

  const accountNodes: DrillDownNode[] = [];
  for (const [accountId, accountLines] of byAccount) {
    const account = input.accounts.find((a) => a.id === accountId);
    const byCat = new Map<string, CashFlowLine[]>();
    for (const l of accountLines) {
      const ck = l.categoryId ?? l.costCenterId ?? "geral";
      const arr = byCat.get(ck) ?? [];
      arr.push(l);
      byCat.set(ck, arr);
    }

    const categoryNodes: DrillDownNode[] = [];
    for (const [catKey, catLines] of byCat) {
      const entries: DrillDownNode[] = catLines.map((l) => {
        const title = input.titles?.find(
          (t) => t.id === l.origin.id && (t.kind === "payable" || t.kind === "receivable"),
        );
        const movement = input.movements?.find((m) => m.id === l.origin.id);
        return {
          level: "entry" as const,
          id: l.id,
          label: l.description,
          amount: l.direction === "in" ? l.amount : -l.amount,
          entryDetail: {
            description: l.description,
            amount: l.amount,
            date: l.date,
            dueDate: title?.dueDate ?? null,
            settlementDate: movement ? toDateOnly(movement.movementDate) : null,
            accountName: account?.name ?? null,
            counterparty: title?.counterparty ?? null,
            category: l.categoryId,
            costCenter: l.costCenterId,
            dreGroup: l.dreGroup,
            origin: l.origin,
            correlationId: l.origin.correlationId ?? movement?.transferGroupId ?? null,
            importRunId: l.origin.importRunId ?? null,
          },
        };
      });

      categoryNodes.push({
        level: "category",
        id: catKey,
        label: catKey === "geral" ? "Sem categoria / centro" : catKey,
        amount: entries.reduce((s, e) => s + (e.amount ?? 0), 0),
        children: entries,
      });
    }

    accountNodes.push({
      level: "account",
      id: accountId,
      label: account?.name ?? "Sem conta bancária",
      amount: accountLines.reduce(
        (s, l) => s + (l.direction === "in" ? l.amount : -l.amount),
        0,
      ),
      children: categoryNodes,
    });
  }

  return {
    level: "indicator",
    id: input.indicatorKey,
    label: input.indicatorLabel,
    children: [
      {
        level: "period",
        id: `${input.periodFrom}_${input.periodTo}`,
        label: `${input.periodFrom} → ${input.periodTo}`,
        children: accountNodes,
      },
    ],
  };
}
