/** Eventos reais Asaas (docs oficiais). Não inventar nomes. */

export const ASAAS_PAYMENT_EVENTS = [
  "PAYMENT_CREATED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED",
  "PAYMENT_OVERDUE",
  "PAYMENT_REFUNDED",
  "PAYMENT_DELETED",
  "PAYMENT_RESTORED",
] as const;

export const ASAAS_SUBSCRIPTION_EVENTS = [
  "SUBSCRIPTION_CREATED",
  "SUBSCRIPTION_UPDATED",
  "SUBSCRIPTION_INACTIVATED",
  "SUBSCRIPTION_DELETED",
] as const;

export type AsaasBillingType = "BOLETO" | "PIX" | "CREDIT_CARD";

export type AsaasCustomerInput = {
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
  externalReference: string; // tenant_id
};

export type AsaasCustomer = {
  id: string;
  name?: string;
  email?: string;
  cpfCnpj?: string;
  externalReference?: string | null;
};

export type AsaasSubscription = {
  id: string;
  customer: string;
  billingType: string;
  value: number;
  cycle: string;
  status: string;
  nextDueDate?: string;
  externalReference?: string | null;
  deleted?: boolean;
};

export type AsaasPayment = {
  id: string;
  customer?: string;
  subscription?: string | null;
  billingType?: string;
  status?: string;
  value?: number;
  dueDate?: string;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
  pixTransaction?: unknown;
};

export type AsaasWebhookPayload = {
  id?: string;
  event?: string;
  payment?: AsaasPayment & Record<string, unknown>;
  subscription?: AsaasSubscription & Record<string, unknown>;
};
