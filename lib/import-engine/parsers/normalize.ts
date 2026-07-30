/**
 * Sprint 22.5 — normalização de texto, números e datas (agnóstico de módulo).
 */

export function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

export function normalizeHeader(value: string): string {
  return stripDiacritics(String(value ?? ""))
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s./-]/g, "");
}

export function normalizeText(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim().replace(/\s+/g, " ");
}

export function parseBrazilianOrAmericanNumber(
  raw: unknown,
): { value: number | null; warning?: string } {
  if (raw == null || raw === "") return { value: null };
  if (typeof raw === "number" && Number.isFinite(raw)) return { value: raw };

  let s = String(raw).trim();
  if (!s) return { value: null };

  s = s.replace(/\s/g, "").replace(/R\$|USD|€|\$/gi, "");

  const neg = /^\(.*\)$/.test(s) || s.startsWith("-");
  s = s.replace(/[()]/g, "").replace(/^\+/, "").replace(/^-/, "");

  if (!s) return { value: null };

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    // BR: 1.234,56 | US: 1,234.56
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma && !hasDot) {
    // 1234,56 or 1,234 (ambiguous) — treat comma as decimal if ≤2 digits after
    const parts = s.split(",");
    if (parts[1] && parts[1].length <= 2) {
      s = `${parts[0].replace(/\./g, "")}.${parts[1]}`;
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasDot && !hasComma) {
    const parts = s.split(".");
    if (parts.length > 2) {
      // 1.234.567
      s = s.replace(/\./g, "");
    } else if (parts[1] && parts[1].length === 3 && parts[0].length <= 3) {
      // Could be thousand sep 1.234
      s = s.replace(/\./g, "");
    }
    // else keep as decimal 1234.56
  }

  const n = Number(s);
  if (!Number.isFinite(n)) {
    return { value: null, warning: `Valor numérico inválido: ${raw}` };
  }
  return { value: neg ? -Math.abs(n) : n };
}

export function parseFlexibleDate(
  raw: unknown,
): { value: string | null; warning?: string } {
  if (raw == null || raw === "") return { value: null };
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return { value: raw.toISOString().slice(0, 10) };
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    // Excel serial date (days since 1899-12-30)
    if (raw > 20000 && raw < 80000) {
      const epoch = Date.UTC(1899, 11, 30);
      const d = new Date(epoch + raw * 86400000);
      return { value: d.toISOString().slice(0, 10) };
    }
  }

  const s = String(raw).trim();
  if (!s) return { value: null };

  // ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const iso = s.slice(0, 10);
    const t = Date.parse(iso);
    if (!Number.isNaN(t)) return { value: iso };
  }

  // BR dd/mm/yyyy or dd-mm-yyyy
  const br = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (br) {
    const dd = Number(br[1]);
    const mm = Number(br[2]);
    let yyyy = Number(br[3]);
    if (yyyy < 100) yyyy += yyyy >= 70 ? 1900 : 2000;
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
      return { value: null, warning: `Data inválida: ${raw}` };
    }
    const iso = `${String(yyyy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return { value: null, warning: `Data inválida: ${raw}` };
    return { value: iso };
  }

  // US mm/dd/yyyy
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) {
    const mm = Number(us[1]);
    const dd = Number(us[2]);
    const yyyy = Number(us[3]);
    if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      const iso = `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
      return { value: iso };
    }
  }

  return { value: null, warning: `Data não reconhecida: ${raw}` };
}

export function isRowEmpty(row: Record<string, unknown>): boolean {
  return Object.values(row).every((v) => {
    if (v == null) return true;
    if (typeof v === "string") return v.trim() === "";
    return false;
  });
}

export function fingerprintRow(values: Record<string, unknown>): string {
  const keys = Object.keys(values).sort();
  return keys
    .map((k) => `${k}=${normalizeText(values[k]).toLowerCase()}`)
    .join("|");
}
