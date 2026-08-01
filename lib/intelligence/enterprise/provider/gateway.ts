/**
 * Fase 27 — Provider Gateway.
 * Deterministic sempre disponível; externos OFF por padrão.
 */

import { getIntelligenceFeatureFlags } from "../feature-flags.ts";
import { redactSensitiveText } from "../privacy/redact.ts";
import { scanImportedContent } from "../../../import-engine/assisted-intelligence/prompt-injection.ts";
import type {
  IntelligenceMode,
  IntelligenceProviderInfo,
  IntelligenceRequest,
  IntelligenceResponse,
} from "../types.ts";
import { createHash, randomUUID } from "node:crypto";

export type ProviderHealth = {
  ok: boolean;
  providerId: string;
  mode: IntelligenceMode;
  message: string;
  configured: boolean;
};

export type IntelligenceProvider = {
  id: string;
  label: string;
  isExternal: boolean;
  healthCheck: () => Promise<ProviderHealth>;
  generate: (req: IntelligenceRequest, contextSummary: string) => Promise<{
    answer: string;
    summary: string;
    limitations: string[];
    model?: string | null;
    tokenUsage?: IntelligenceResponse["tokenUsage"];
  }>;
  getCapabilities: () => string[];
};

const DETERMINISTIC_PROVIDER: IntelligenceProvider = {
  id: "deterministic",
  label: "Regras locais · evidências auditáveis",
  isExternal: false,
  async healthCheck() {
    return {
      ok: true,
      providerId: "deterministic",
      mode: "deterministic",
      message: "Provider determinístico operacional",
      configured: true,
    };
  },
  async generate(req, contextSummary) {
    const scan = scanImportedContent(req.question ?? "");
    const safeQuestion = redactSensitiveText(scan.sanitizedText).text;
    return {
      answer:
        safeQuestion.trim().length > 0
          ? `Análise determinística da pergunta: "${safeQuestion.slice(0, 240)}". ` +
            `Contexto: ${contextSummary.slice(0, 400) || "sem métricas suficientes"}.`
          : `Análise determinística (${req.intent}). ` +
            `Contexto: ${contextSummary.slice(0, 400) || "sem métricas suficientes"}.`,
      summary: `Modo deterministic · intent ${req.intent}`,
      limitations: [
        "Resposta baseada em regras e fontes canônicas — não é IA generativa.",
        ...(scan.safe ? [] : ["Sinais de conteúdo não confiável sanitizados."]),
      ],
      model: "rules-v27",
      tokenUsage: null,
    };
  },
  getCapabilities: () => [
    "generate",
    "explain",
    "summarize",
    "classify",
    "structured",
  ],
};

const EXTERNAL_STUB: IntelligenceProvider = {
  id: "external-stub",
  label: "Provider externo (não configurado)",
  isExternal: true,
  async healthCheck() {
    const configured =
      Boolean(process.env.INTELLIGENCE_EXTERNAL_API_KEY?.trim()) &&
      Boolean(process.env.INTELLIGENCE_EXTERNAL_ENDPOINT?.trim());
    return {
      ok: false,
      providerId: "external-stub",
      mode: configured ? "provider_assisted" : "unavailable",
      message: configured
        ? "Chave presente, mas adapter externo ainda em stub seguro (sem chamada real)."
        : "Provider externo desligado / sem credenciais.",
      configured,
    };
  },
  async generate() {
    throw new Error("EXTERNAL_PROVIDER_UNAVAILABLE");
  },
  getCapabilities: () => [],
};

export function resolveIntelligenceProvider(
  requested?: IntelligenceMode,
): {
  provider: IntelligenceProvider;
  mode: IntelligenceMode;
  fallbackReason?: string;
} {
  const flags = getIntelligenceFeatureFlags();
  if (!flags.enabled) {
    return {
      provider: DETERMINISTIC_PROVIDER,
      mode: "unavailable",
      fallbackReason: "intelligence.enabled=false",
    };
  }

  if (requested === "unavailable") {
    return { provider: DETERMINISTIC_PROVIDER, mode: "unavailable" };
  }

  if (
    requested === "provider_assisted" &&
    flags.externalProvider
  ) {
    // Stub nunca finge sucesso — força fallback explícito
    return {
      provider: DETERMINISTIC_PROVIDER,
      mode: "deterministic",
      fallbackReason:
        "Provider assistido solicitado, mas adapter externo não está live; fallback deterministic explícito.",
    };
  }

  if (!flags.deterministic) {
    return {
      provider: DETERMINISTIC_PROVIDER,
      mode: "unavailable",
      fallbackReason: "deterministic desabilitado",
    };
  }

  return { provider: DETERMINISTIC_PROVIDER, mode: "deterministic" };
}

export async function providerGatewayHealth(): Promise<ProviderHealth[]> {
  const det = await DETERMINISTIC_PROVIDER.healthCheck();
  const ext = await EXTERNAL_STUB.healthCheck();
  return [det, ext];
}

export function toProviderInfo(
  provider: IntelligenceProvider,
  mode: IntelligenceMode,
  model?: string | null,
): IntelligenceProviderInfo {
  return {
    id: provider.id,
    label: provider.label,
    kind: mode,
    model: model ?? null,
    isExternal: provider.isExternal,
  };
}

export function newCorrelationId(seed?: string): string {
  if (seed) {
    return createHash("sha256").update(seed).digest("hex").slice(0, 24);
  }
  return randomUUID().replace(/-/g, "").slice(0, 24);
}

export { DETERMINISTIC_PROVIDER, EXTERNAL_STUB };
