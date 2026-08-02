/**
 * Resolução segura de labels para selects (Sprint 27.8.2).
 * Nunca usa UUID como label visível.
 */

export type ResolvableOption = {
  value: string;
  label: string;
  description?: string | null;
  type?: string | null;
  metadata?: unknown;
  disabled?: boolean;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isTechnicalId(value: string | null | undefined): boolean {
  if (!value) return false;
  return UUID_RE.test(value.trim());
}

export function looksLikeTechnicalCode(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = value.trim();
  if (isTechnicalId(v)) return true;
  // snake_case técnico sem espaços (ex.: cartao_credito)
  return /^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/.test(v);
}

export type ResolveOptionLabelOptions = {
  /** Nome vindo da entidade carregada à parte */
  entityName?: string | null;
  /** Descrição auxiliar */
  description?: string | null;
  /** Código amigável (SKU, CC-001, etc.) — nunca UUID */
  friendlyCode?: string | null;
  unavailableLabel?: string;
  loadingLabel?: string;
  loading?: boolean;
};

/**
 * Prioridade: option.label → entityName → description → friendlyCode → indisponível.
 * Nunca retorna UUID.
 */
export function resolveOptionLabel(
  value: string | null | undefined,
  options: ResolvableOption[],
  opts: ResolveOptionLabelOptions = {},
): string {
  if (opts.loading) return opts.loadingLabel ?? "Carregando…";

  const unavailable = opts.unavailableLabel ?? "Registro indisponível";
  // Vazio = sem seleção (placeholder fica a cargo do componente)
  if (value == null || value === "") return "";

  const match = options.find((o) => o.value === value);
  if (match?.label?.trim()) {
    const label = match.label.trim();
    if (!isTechnicalId(label)) return label;
  }

  if (opts.entityName?.trim() && !isTechnicalId(opts.entityName)) {
    return opts.entityName.trim();
  }

  if (match?.description?.trim() && !isTechnicalId(match.description)) {
    return match.description.trim();
  }

  if (opts.description?.trim() && !isTechnicalId(opts.description)) {
    return opts.description.trim();
  }

  if (
    opts.friendlyCode?.trim() &&
    !isTechnicalId(opts.friendlyCode) &&
    !looksLikeTechnicalCode(opts.friendlyCode)
  ) {
    return opts.friendlyCode.trim();
  }

  if (process.env.NODE_ENV === "development" && isTechnicalId(value)) {
    console.warn("[gf/resolveOptionLabel] missing label for id", value);
  }

  return unavailable;
}
