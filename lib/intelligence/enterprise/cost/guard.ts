/**
 * Fase 27 — Cost / rate / budget guards (sem cobrança).
 */

export type CostBudget = {
  dailyRequestLimit: number;
  monthlyRequestLimit: number;
  dailyTokenBudget: number;
};

const DEFAULT_BUDGET: CostBudget = {
  dailyRequestLimit: 200,
  monthlyRequestLimit: 5000,
  dailyTokenBudget: 200_000,
};

type CounterKey = string;
const counters = new Map<CounterKey, { requests: number; tokens: number; day: string }>();

function dayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function checkIntelligenceBudget(input: {
  tenantId: string;
  userId: string;
  estimatedTokens?: number;
  budget?: Partial<CostBudget>;
}): { ok: boolean; reason?: string } {
  const budget = { ...DEFAULT_BUDGET, ...input.budget };
  const key = `${input.tenantId}:${input.userId}:${dayKey()}`;
  const cur = counters.get(key) ?? {
    requests: 0,
    tokens: 0,
    day: dayKey(),
  };
  if (cur.requests + 1 > budget.dailyRequestLimit) {
    return { ok: false, reason: "daily_request_limit" };
  }
  if (cur.tokens + (input.estimatedTokens ?? 0) > budget.dailyTokenBudget) {
    return { ok: false, reason: "daily_token_budget" };
  }
  return { ok: true };
}

export function consumeIntelligenceBudget(input: {
  tenantId: string;
  userId: string;
  tokens?: number;
}) {
  const key = `${input.tenantId}:${input.userId}:${dayKey()}`;
  const cur = counters.get(key) ?? { requests: 0, tokens: 0, day: dayKey() };
  cur.requests += 1;
  cur.tokens += input.tokens ?? 0;
  counters.set(key, cur);
}

export function resetIntelligenceBudgetForTests() {
  counters.clear();
}

export function estimateCostUsd(tokens: number, pricePer1k = 0): number {
  // Sem cobrança nesta fase — sempre 0 salvo override explícito de preço
  return Number(((tokens / 1000) * pricePer1k).toFixed(6));
}
