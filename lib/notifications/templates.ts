/**
 * Sprint 21.5 — Templates e registry.
 */

import type { NotificationTemplate } from "./types.ts";
import { NotificationTemplateError } from "./notification-errors.ts";

const templates = new Map<string, NotificationTemplate>();

export function templateKey(id: string, version: string): string {
  return `${id.trim()}@${version.trim()}`;
}

export function registerTemplate(template: NotificationTemplate): void {
  if (!template.id?.trim() || !template.version?.trim()) {
    throw new NotificationTemplateError("Template exige id e version.");
  }
  if (!template.titleTemplate || !template.messageTemplate) {
    throw new NotificationTemplateError("Template exige title e message.");
  }
  const key = templateKey(template.id, template.version);
  if (templates.has(key)) {
    throw new NotificationTemplateError(`Template já registrado: ${key}`);
  }
  templates.set(key, template);
}

export function getTemplate(
  id: string,
  version = "1.0.0",
): NotificationTemplate | undefined {
  return templates.get(templateKey(id, version));
}

/** Resolve template respeitando escopo multi-tenant (sem vazamento). */
export function getTemplateForTenant(
  id: string,
  tenantId: string | null | undefined,
  version = "1.0.0",
): NotificationTemplate | undefined {
  const template = getTemplate(id, version);
  if (!template) return undefined;
  if (template.tenantScope === "global") return template;
  if (!tenantId?.trim()) return undefined;
  if (template.tenantId !== tenantId) return undefined;
  return template;
}

export function listTemplates(): NotificationTemplate[] {
  return [...templates.values()].sort((a, b) =>
    templateKey(a.id, a.version).localeCompare(templateKey(b.id, b.version)),
  );
}

export function clearTemplates(): void {
  templates.clear();
}

/** Templates padrão do catálogo (registrados sob demanda). */
export function createDefaultTemplates(): NotificationTemplate[] {
  return [
    {
      id: "approval-requested",
      version: "1.0.0",
      event: "APPROVAL_REQUESTED",
      category: "approval",
      tenantScope: "global",
      supportedChannels: ["in_app", "inbox", "email"],
      titleTemplate: "Aprovação pendente: {{approvalId}}",
      messageTemplate:
        "{{userName}}, há uma aprovação de {{amount}} aguardando decisão.",
      variablesSchema: ["userName", "amount", "approvalId"],
      fallbacks: { userName: "Usuário", amount: "—", approvalId: "—" },
      actions: [
        { id: "open", label: "Abrir", type: "primary" },
        { id: "dismiss", label: "Dispensar", type: "dismiss" },
      ],
    },
    {
      id: "workflow-transitioned",
      version: "1.0.0",
      event: "WORKFLOW_TRANSITIONED",
      category: "workflow",
      tenantScope: "global",
      supportedChannels: ["in_app", "inbox"],
      titleTemplate: "Workflow {{workflowName}} avançou",
      messageTemplate: "O fluxo {{workflowName}} mudou de estado.",
      variablesSchema: ["workflowName"],
      fallbacks: { workflowName: "Workflow" },
    },
    {
      id: "security-access-denied",
      version: "1.0.0",
      event: "SECURITY_ACCESS_DENIED",
      category: "security",
      tenantScope: "global",
      supportedChannels: ["in_app", "inbox"],
      titleTemplate: "Acesso negado",
      messageTemplate: "{{userName}}, sua ação foi bloqueada por segurança.",
      variablesSchema: ["userName"],
      fallbacks: { userName: "Usuário" },
    },
    {
      id: "payment-due",
      version: "1.0.0",
      event: "PAYMENT_DUE",
      category: "finance",
      tenantScope: "global",
      supportedChannels: ["in_app", "inbox", "email"],
      titleTemplate: "Pagamento a vencer",
      messageTemplate: "Vencimento em {{dueDate}} · valor {{amount}}.",
      variablesSchema: ["dueDate", "amount"],
      fallbacks: { dueDate: "—", amount: "—" },
    },
    {
      id: "system-critical",
      version: "1.0.0",
      event: "SYSTEM_CRITICAL",
      category: "system",
      tenantScope: "global",
      supportedChannels: ["in_app", "inbox", "email", "push"],
      titleTemplate: "Alerta crítico",
      messageTemplate: "{{message}}",
      variablesSchema: ["message"],
      fallbacks: { message: "Incidente crítico detectado." },
    },
  ];
}

export function ensureDefaultTemplates(): void {
  if (templates.size > 0) return;
  for (const t of createDefaultTemplates()) {
    registerTemplate(t);
  }
}
