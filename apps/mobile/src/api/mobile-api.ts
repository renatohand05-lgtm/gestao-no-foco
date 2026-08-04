import { apiRequest } from "@/api/client";
import { getAccessToken } from "@/auth/secure-session";

export type MeResponse = {
  id: string;
  email: string;
  displayName: string;
};

export type MembershipItem = {
  tenantId: string;
  slug: string;
  name: string;
  role: string;
  segmentId: string | null;
};

export type MembershipsResponse = {
  items: MembershipItem[];
};

export type BranchesResponse = {
  items: { id: string; name: string }[];
  allowContinueWithoutBranch: boolean;
  message?: string;
};

export type PermissionsResponse = {
  permissions: string[];
  role: string;
};

async function withToken<T>(path: string): Promise<Awaited<ReturnType<typeof apiRequest<T>>>> {
  const accessToken = await getAccessToken();
  return apiRequest<T>(path, {
    context: { accessToken },
    retry: true,
  });
}

export async function fetchMe() {
  return withToken<MeResponse>("api/mobile/v1/me");
}

export async function fetchMemberships() {
  return withToken<MembershipsResponse>("api/mobile/v1/memberships");
}

export async function fetchBranches(tenantId: string) {
  return withToken<BranchesResponse>(`api/mobile/v1/tenants/${tenantId}/branches`);
}

export async function fetchPermissions(tenantId: string) {
  return withToken<PermissionsResponse>(`api/mobile/v1/tenants/${tenantId}/permissions`);
}

export async function postLogout() {
  const accessToken = await getAccessToken();
  return apiRequest<{ ok: boolean; message: string }>("api/mobile/v1/auth/logout", {
    method: "POST",
    context: { accessToken },
  });
}

export type MobileExecutiveDashboard = {
  generatedAt: string;
  greeting: string;
  welcome: string;
  user: { displayName: string | null; initials: string };
  context: {
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
    branchId: string | null;
    branchName: string | null;
    segment: string | null;
  };
  clock: { timeLabel: string; dateLabel: string; timezone: string };
  kpis: {
    id: string;
    title: string;
    value: string;
    supportingText: string;
    tone: string;
    trendLabel: string | null;
    unavailable: boolean;
  }[];
  brief: {
    day: { label: string; value: string; detail: string; available: boolean };
    week: { label: string; value: string; detail: string; available: boolean };
    month: { label: string; value: string; detail: string; available: boolean };
    topAlerts: { id: string; title: string; priority: string; category: string }[];
    biggestOpportunity: { title: string; body: string; href: string } | null;
    biggestRisk: { title: string; body: string; href: string } | null;
    nextAction: { label: string; href: string; reason: string };
  };
  decision: {
    summary: {
      headline: string;
      criticalCount: number;
      warningCount: number;
      opportunityCount: number;
      infoCount: number;
      totalCount: number;
    };
    items: {
      id: string;
      title: string;
      description: string;
      severity: string;
      category: string;
      actionLabel: string | null;
      href: string | null;
      source: string;
    }[];
  };
  alerts: {
    id: string;
    title: string;
    description: string;
    impact: string;
    suggestedAction: string;
    href: string;
    priority: string;
    category: string;
    source: string;
  }[];
  metas: {
    month: {
      meta: string;
      realizado: string;
      pct: string;
      projecao: string;
      diasRestantes: string;
      valorRestante: string;
      tone: string;
      available: boolean;
    };
    day: {
      label: string;
      meta: string;
      realizado: string;
      pct: string;
      available: boolean;
    };
    week: {
      label: string;
      meta: string;
      realizado: string;
      pct: string;
      available: boolean;
    };
  };
  quickActions: {
    id: string;
    label: string;
    href: string;
    permission: string | null;
    enabled: boolean;
  }[];
  updatedAtLabel: string;
};

export async function fetchExecutiveDashboard(input: {
  tenantId: string;
  branchId?: string | null;
  branchName?: string | null;
}) {
  const accessToken = await getAccessToken();
  const headers: Record<string, string> = {};
  if (input.branchName) headers["x-gof-branch-name"] = input.branchName;
  return apiRequest<MobileExecutiveDashboard>(
    `api/mobile/v1/tenants/${input.tenantId}/dashboard`,
    {
      context: {
        accessToken,
        tenantId: input.tenantId,
        branchId: input.branchId,
      },
      headers,
      retry: true,
    },
  );
}

export type MobileFinanceSummary = {
  generatedAt: string;
  period: { dataDe: string; dataAte: string };
  updatedAtLabel: string;
  saldoAtual: string | null;
  entradasPrevistas: string | null;
  saidasPrevistas: string | null;
  saldoProjetado: string | null;
  contasReceberAberto: string | null;
  contasPagarAberto: string | null;
  vencidoReceber: string | null;
  vencidoPagar: string | null;
  receitaPeriodo: string | null;
  despesaPeriodo: string | null;
  resultado: string | null;
  margem: string | null;
  unavailable: string[];
  alerts: {
    id: string;
    title: string;
    description: string;
    priority: string;
    category: string;
    href: string | null;
  }[];
  quickActions: {
    id: string;
    label: string;
    href: string;
    permission: string | null;
    enabled: boolean;
    opensWeb: boolean;
  }[];
};

export type MobileFinanceListItem = {
  id: string;
  title: string;
  subtitle: string;
  amount: string;
  dueDate: string;
  status: string;
  overdue: boolean;
  parcelLabel: string | null;
};

export type MobileFinanceListResponse = {
  resumo: Record<string, number> | null;
  items: MobileFinanceListItem[];
  page: number;
  total: number;
};

export type MobileCashFlow = {
  period: { dataDe: string; dataAte: string };
  resumo: {
    saldoInicial: string | null;
    entradas: string | null;
    saidas: string | null;
    saldoFinal: string | null;
    saldoProjetado: string | null;
    saldoAtual: string | null;
  };
  daily: { date: string; entradas: string; saidas: string; saldo: string }[];
  unavailable: boolean;
};

export type MobileDreSummary = {
  period: { dataDe: string; dataAte: string };
  lines: { id: string; label: string; value: string; emphasis?: boolean }[];
  unavailable: boolean;
};

export type MobileApprovalList = {
  available: boolean;
  message: string;
  items: {
    id: string;
    title: string;
    status: string;
    amountLabel: string | null;
    requester: string | null;
  }[];
  webHref: string;
};

export type MobileFinanceDetail = {
  kind: string;
  id: string;
  title: string;
  fields: { label: string; value: string }[];
};

async function financeGet<T>(
  tenantId: string,
  path: string,
  branchId?: string | null,
) {
  const accessToken = await getAccessToken();
  return apiRequest<T>(`api/mobile/v1/tenants/${tenantId}/financeiro/${path}`, {
    context: { accessToken, tenantId, branchId },
    retry: true,
  });
}

export function fetchFinanceSummary(input: {
  tenantId: string;
  branchId?: string | null;
}) {
  return financeGet<MobileFinanceSummary>(
    input.tenantId,
    "summary",
    input.branchId,
  );
}

export function fetchAccountsPayable(input: {
  tenantId: string;
  branchId?: string | null;
  page?: number;
  status?: string;
}) {
  const qs = new URLSearchParams();
  if (input.page) qs.set("page", String(input.page));
  if (input.status) qs.set("status", input.status);
  const suffix = qs.toString() ? `?${qs}` : "";
  return financeGet<MobileFinanceListResponse>(
    input.tenantId,
    `accounts-payable${suffix}`,
    input.branchId,
  );
}

export function fetchAccountsReceivable(input: {
  tenantId: string;
  branchId?: string | null;
  page?: number;
  status?: string;
}) {
  const qs = new URLSearchParams();
  if (input.page) qs.set("page", String(input.page));
  if (input.status) qs.set("status", input.status);
  const suffix = qs.toString() ? `?${qs}` : "";
  return financeGet<MobileFinanceListResponse>(
    input.tenantId,
    `accounts-receivable${suffix}`,
    input.branchId,
  );
}

export function fetchCashFlow(input: {
  tenantId: string;
  branchId?: string | null;
}) {
  return financeGet<MobileCashFlow>(input.tenantId, "cash-flow", input.branchId);
}

export function fetchDreMobile(input: {
  tenantId: string;
  branchId?: string | null;
}) {
  return financeGet<MobileDreSummary>(input.tenantId, "dre", input.branchId);
}

export function fetchFinanceApprovals(input: {
  tenantId: string;
  branchId?: string | null;
}) {
  return financeGet<MobileApprovalList>(
    input.tenantId,
    "approvals",
    input.branchId,
  );
}

export function fetchFinanceDetail(input: {
  tenantId: string;
  id: string;
  kind: "pagar" | "receber";
  branchId?: string | null;
}) {
  return financeGet<MobileFinanceDetail>(
    input.tenantId,
    `transactions/${input.id}?kind=${input.kind}`,
    input.branchId,
  );
}
