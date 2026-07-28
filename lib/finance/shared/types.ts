/**
 * Sprint 22.1 — Enterprise Finance Core · tipos compartilhados.
 */

export type FinancePermission =
  | "financeiro.visualizar"
  | "financeiro.criar"
  | "financeiro.editar"
  | "financeiro.excluir"
  | "financeiro.arquivar"
  | "financeiro.transferir"
  | "financeiro.aprovar"
  | "financeiro.ver_saldos"
  | "financeiro.ver_fluxo_caixa";

export type BankAccountType =
  | "corrente"
  | "poupanca"
  | "investimento"
  | "caixa"
  | "outros";

export type BankAccountStatus = "active" | "archived";

export type CashMovementKind =
  | "entrada"
  | "saida"
  | "transferencia"
  | "ajuste"
  | "estorno";

export type CategoryKind =
  | "receita"
  | "despesa"
  | "transferencia"
  | "investimento"
  | "impostos"
  | "operacional";

export type BankAccount = {
  id: string;
  tenantId: string;
  name: string;
  bank: string | null;
  agency: string | null;
  accountNumber: string | null;
  type: BankAccountType;
  initialBalance: number;
  currentBalance: number;
  status: BankAccountStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CashMovement = {
  id: string;
  tenantId: string;
  bankAccountId: string;
  counterpartyAccountId: string | null;
  kind: CashMovementKind;
  amount: number;
  movementDate: string;
  description: string;
  categoryId: string | null;
  costCenterId: string | null;
  notes: string | null;
  transferGroupId: string | null;
  reversedMovementId: string | null;
  balanceAfter: number | null;
  createdAt: string;
};

export type Category = {
  id: string;
  tenantId: string;
  name: string;
  kind: CategoryKind;
  parentId: string | null;
  active: boolean;
  color: string | null;
  notes: string | null;
  createdAt: string;
};

export type CostCenter = {
  id: string;
  tenantId: string;
  name: string;
  code: string | null;
  active: boolean;
  notes: string | null;
  createdAt: string;
};

export type CashFlowPoint = {
  date: string;
  inflows: number;
  outflows: number;
  net: number;
  balance: number;
};

export type CashFlow = {
  tenantId: string;
  from: string;
  to: string;
  openingBalance: number;
  closingBalance: number;
  totalInflows: number;
  totalOutflows: number;
  points: CashFlowPoint[];
  movements: CashMovement[];
};

export type FinancialSummary = {
  tenantId: string;
  currentBalance: number;
  inflowsToday: number;
  outflowsToday: number;
  projectedBalance: number;
  availableBalance: number;
  dailyNet: number;
  monthlyNet: number;
  asOf: string;
};

export type CreateBankAccountInput = {
  name: string;
  bank?: string | null;
  agency?: string | null;
  accountNumber?: string | null;
  type: BankAccountType;
  initialBalance?: number;
  notes?: string | null;
};

export type UpdateBankAccountInput = Partial<CreateBankAccountInput> & {
  status?: BankAccountStatus;
};

export type CreateMovementInput = {
  bankAccountId: string;
  kind: CashMovementKind;
  amount: number;
  movementDate: string;
  description: string;
  categoryId?: string | null;
  costCenterId?: string | null;
  notes?: string | null;
  /** Transferência */
  toAccountId?: string | null;
  /** Estorno */
  reverseMovementId?: string | null;
};

export type UpdateMovementInput = {
  description?: string;
  notes?: string | null;
  categoryId?: string | null;
  costCenterId?: string | null;
};

export type CreateCategoryInput = {
  name: string;
  kind: CategoryKind;
  parentId?: string | null;
  color?: string | null;
  notes?: string | null;
};

export type CreateCostCenterInput = {
  name: string;
  code?: string | null;
  notes?: string | null;
};
