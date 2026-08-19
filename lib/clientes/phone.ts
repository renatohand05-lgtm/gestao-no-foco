import { onlyDigits } from "./masks.ts";

/**
 * Normaliza telefone BR para armazenamento interno (+55…).
 * Não inventa DDI se o número já tiver 55 ou tamanho inesperado.
 */
export function normalizeBrWhatsappDigits(input: string | null | undefined): string {
  const digits = onlyDigits(input ?? "");
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12 && digits.length <= 13) {
    return digits;
  }
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

export function toStoredWhatsapp(input: string | null | undefined): string | null {
  const digits = normalizeBrWhatsappDigits(input);
  if (!digits) return null;
  return `+${digits}`;
}

export function customerWhatsappAvailable(
  whatsapp?: string | null,
  telefone?: string | null,
): boolean {
  const digits = onlyDigits(`${whatsapp ?? ""}${telefone ?? ""}`);
  return digits.length >= 10;
}

export function customerEmailAvailable(email?: string | null): boolean {
  return Boolean(email?.includes("@"));
}
