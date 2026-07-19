/** Normalização e validação leve para Master Data. */

export function normalizeMasterName(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function onlyDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

export function slugifyTag(nome: string): string {
  return normalizeMasterName(nome).replace(/\s+/g, "-");
}

export function validateDocumento(
  documento: string | null | undefined,
): { ok: true; digits: string | null } | { ok: false; message: string } {
  if (!documento?.trim()) return { ok: true, digits: null };
  const digits = onlyDigits(documento);
  if (digits.length !== 11 && digits.length !== 14) {
    return {
      ok: false,
      message: "Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.",
    };
  }
  return { ok: true, digits };
}

export function isBlank(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  return false;
}
