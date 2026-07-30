/**
 * Sprint 25.4.3 — Contrato OCR (sem simular em produção).
 */

export type OcrProviderId = "none" | "mock_test" | "external";

export type OcrProviderCapability = {
  id: OcrProviderId;
  configured: boolean;
  safeForProduction: boolean;
  label: string;
  requiredEnv: string[];
};

export function resolveOcrProvider(env: NodeJS.ProcessEnv = process.env): OcrProviderCapability {
  const flag =
    (env.IMPORT_OCR_ENABLED ?? "").trim().toLowerCase() === "1" ||
    (env.IMPORT_OCR_ENABLED ?? "").trim().toLowerCase() === "true";
  const provider = (env.IMPORT_OCR_PROVIDER ?? "none").trim().toLowerCase();

  if (!flag) {
    return {
      id: "none",
      configured: false,
      safeForProduction: false,
      label: "OCR desligado (IMPORT_OCR_ENABLED=0)",
      requiredEnv: ["IMPORT_OCR_ENABLED", "IMPORT_OCR_PROVIDER", "IMPORT_OCR_API_KEY"],
    };
  }

  if (provider === "mock_test" && env.NODE_ENV !== "production") {
    return {
      id: "mock_test",
      configured: true,
      safeForProduction: false,
      label: "Mock OCR (somente testes)",
      requiredEnv: ["IMPORT_OCR_ENABLED", "IMPORT_OCR_PROVIDER"],
    };
  }

  if (provider === "external" && env.IMPORT_OCR_API_KEY?.trim()) {
    return {
      id: "external",
      configured: true,
      safeForProduction: true,
      label: "Provider OCR externo configurado",
      requiredEnv: ["IMPORT_OCR_ENABLED", "IMPORT_OCR_PROVIDER", "IMPORT_OCR_API_KEY"],
    };
  }

  return {
    id: "none",
    configured: false,
    safeForProduction: false,
    label: "OCR requer provedor configurado",
    requiredEnv: ["IMPORT_OCR_ENABLED", "IMPORT_OCR_PROVIDER", "IMPORT_OCR_API_KEY"],
  };
}

export function assertOcrAllowed(input: {
  consent: boolean;
  provider?: OcrProviderCapability;
}): OcrProviderCapability {
  const provider = input.provider ?? resolveOcrProvider();
  if (!provider.configured) {
    throw new Error(
      "OCR requer provedor configurado. Defina IMPORT_OCR_ENABLED=1, IMPORT_OCR_PROVIDER e IMPORT_OCR_API_KEY.",
    );
  }
  if (!input.consent) {
    throw new Error("Consentimento obrigatório para usar OCR.");
  }
  if (!provider.safeForProduction && process.env.NODE_ENV === "production") {
    throw new Error("OCR mock não é permitido em produção.");
  }
  return provider;
}

/** Mock apenas para testes — nunca em produção. */
export function mockOcrExtractText(_bytes?: Uint8Array): {
  text: string;
  confidence: number;
  provider: "mock_test";
} {
  void _bytes;
  if (process.env.NODE_ENV === "production") {
    throw new Error("mockOcrExtractText bloqueado em produção.");
  }
  return {
    text: "MOCK OCR TEXT",
    confidence: 0.42,
    provider: "mock_test",
  };
}
