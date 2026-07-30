/**
 * Sprint 22.7 — Conteúdo importado é dado não confiável (anti prompt-injection).
 * Nunca interpreta o documento como instrução de sistema.
 */

const INJECTION_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/i, label: "ignore_instructions" },
  { re: /system\s*prompt/i, label: "system_prompt" },
  { re: /\b(do\s+not\s+follow|disregard)\b.*\b(rules|policy|rbac)\b/i, label: "disregard_policy" },
  { re: /\b(execute|run)\s+(sql|shell|command)\b/i, label: "execute_command" },
  { re: /\b(drop|delete|truncate)\s+(table|database)\b/i, label: "sql_ddl" },
  { re: /\b(access|switch)\s+(other\s+)?tenant\b/i, label: "cross_tenant" },
  { re: /\boverride\s+(rbac|permissions|rules)\b/i, label: "override_rbac" },
  { re: /\b(auto[- ]?confirm|skip\s+review|approve\s+all)\b/i, label: "auto_confirm" },
  { re: /<\s*script\b/i, label: "script_tag" },
  { re: /\{\{\s*system\s*\}\}/i, label: "template_system" },
];

export type PromptInjectionScan = {
  safe: boolean;
  signals: string[];
  sanitizedText: string;
  treatedAsUntrustedData: true;
};

/**
 * Escaneia e sanitiza texto importado. Sempre retorna `treatedAsUntrustedData: true`.
 * Não executa comandos; não altera regras do sistema.
 */
export function scanImportedContent(raw: string): PromptInjectionScan {
  const text = String(raw ?? "");
  const signals: string[] = [];
  for (const p of INJECTION_PATTERNS) {
    if (p.re.test(text)) signals.push(p.label);
  }
  // Remover sequências que poderiam ser interpretadas como markup de instrução
  const sanitizedText = text
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50_000);

  return {
    safe: signals.length === 0,
    signals,
    sanitizedText,
    treatedAsUntrustedData: true,
  };
}

export function assertUntrustedDataOnly(scan: PromptInjectionScan): void {
  if (!scan.treatedAsUntrustedData) {
    throw new Error("Conteúdo importado deve ser tratado exclusivamente como dado.");
  }
}
