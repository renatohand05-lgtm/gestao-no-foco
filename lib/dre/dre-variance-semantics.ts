/**
 * Sprint 27.8 — Semântica de variação do DRE (não altera cálculos).
 * Cores/ícones dependem do tipo de conta, não só do sinal matemático.
 */

export type DreAccountSemanticType =
  | "receita"
  | "despesa"
  | "margem"
  | "investimento"
  | "neutro"
  | "indisponivel";

export type DreVarianceTone =
  | "melhoria"
  | "piora"
  | "neutro"
  | "atencao"
  | "indisponivel";

const TONE_CSS: Record<DreVarianceTone, string> = {
  melhoria: "text-success",
  piora: "text-destructive",
  neutro: "text-muted-foreground",
  atencao: "text-[var(--brand-gold)]",
  indisponivel: "text-muted-foreground/70",
};

export function classifyDreLinhaSemantic(
  linhaCodigo: string,
): DreAccountSemanticType {
  const code = linhaCodigo.toLowerCase();

  if (
    code.includes("resultado") ||
    code.includes("margem") ||
    code === "ebitda" ||
    code === "ebit"
  ) {
    return "margem";
  }

  if (
    code.startsWith("receita") ||
    code === "receitas_financeiras" ||
    code.includes("receitas_financeiras")
  ) {
    return "receita";
  }

  if (
    code.includes("deduc") ||
    code === "cmv" ||
    code.includes("despesa") ||
    code.includes("depreciacao") ||
    code.includes("imposto") ||
    code.includes("opex")
  ) {
    return "despesa";
  }

  if (code.includes("investimento") || code.includes("capex")) {
    return "investimento";
  }

  return "neutro";
}

export function getDreVarianceSemantic(input: {
  accountType: DreAccountSemanticType;
  currentValue: number | null | undefined;
  previousValue: number | null | undefined;
  variance?: number | null;
}): {
  tone: DreVarianceTone;
  label: string;
  cssClass: string;
  icon: "up" | "down" | "flat" | "na";
} {
  const { accountType, currentValue, previousValue } = input;

  if (
    accountType === "indisponivel" ||
    currentValue == null ||
    previousValue == null ||
    Number.isNaN(currentValue) ||
    Number.isNaN(previousValue)
  ) {
    return {
      tone: "indisponivel",
      label: "Indisponível",
      cssClass: TONE_CSS.indisponivel,
      icon: "na",
    };
  }

  const variance =
    input.variance != null ? input.variance : currentValue - previousValue;

  if (Math.abs(variance) < 1e-9) {
    return {
      tone: "neutro",
      label: "Estável",
      cssClass: TONE_CSS.neutro,
      icon: "flat",
    };
  }

  const increased = variance > 0;

  if (accountType === "investimento") {
    return {
      tone: "atencao",
      label: increased ? "Aumento" : "Redução",
      cssClass: TONE_CSS.atencao,
      icon: increased ? "up" : "down",
    };
  }

  if (accountType === "neutro") {
    return {
      tone: "neutro",
      label: increased ? "Aumento" : "Redução",
      cssClass: TONE_CSS.neutro,
      icon: increased ? "up" : "down",
    };
  }

  let isMelhoria = false;
  if (accountType === "receita" || accountType === "margem") {
    isMelhoria = increased;
  } else if (accountType === "despesa") {
    isMelhoria = !increased;
  }

  const tone: DreVarianceTone = isMelhoria ? "melhoria" : "piora";
  return {
    tone,
    label: isMelhoria ? "Melhora" : "Piora",
    cssClass: TONE_CSS[tone],
    icon: increased ? "up" : "down",
  };
}
