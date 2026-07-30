/**
 * Sprint 25.4.3 — Revisão linha a linha de importação (estado puro).
 */

export type ImportReviewLineStatus =
  | "novo"
  | "atualizar"
  | "duplicidade"
  | "erro"
  | "baixa_confianca"
  | "ignorado"
  | "ok";

export type ImportReviewLine = {
  rowNumber: number;
  status: ImportReviewLineStatus;
  action: "create" | "update" | "ignore" | "link";
  original: Record<string, unknown>;
  normalized: Record<string, unknown>;
  confidence: number;
  reason: string;
  productId: string | null;
  selected: boolean;
  errors: string[];
};

export type ImportReviewFilter =
  | "all"
  | "erros"
  | "duplicidades"
  | "baixa_confianca"
  | "novos"
  | "atualizados"
  | "selecionados";

export function filterReviewLines(
  lines: ImportReviewLine[],
  filter: ImportReviewFilter,
): ImportReviewLine[] {
  switch (filter) {
    case "erros":
      return lines.filter((l) => l.status === "erro" || l.errors.length > 0);
    case "duplicidades":
      return lines.filter((l) => l.status === "duplicidade");
    case "baixa_confianca":
      return lines.filter((l) => l.status === "baixa_confianca" || l.confidence < 0.6);
    case "novos":
      return lines.filter((l) => l.status === "novo" || l.action === "create");
    case "atualizados":
      return lines.filter((l) => l.status === "atualizar" || l.action === "update");
    case "selecionados":
      return lines.filter((l) => l.selected);
    default:
      return lines;
  }
}

export function selectAllReviewLines(
  lines: ImportReviewLine[],
  selected: boolean,
): ImportReviewLine[] {
  return lines.map((l) => ({ ...l, selected }));
}

export function toggleReviewLine(
  lines: ImportReviewLine[],
  rowNumber: number,
  selected: boolean,
): ImportReviewLine[] {
  return lines.map((l) =>
    l.rowNumber === rowNumber ? { ...l, selected } : l,
  );
}

export function ignoreReviewLine(
  lines: ImportReviewLine[],
  rowNumber: number,
): ImportReviewLine[] {
  return lines.map((l) =>
    l.rowNumber === rowNumber
      ? { ...l, action: "ignore", status: "ignorado", selected: false }
      : l,
  );
}

export function assertNoSilentErrorCommit(lines: ImportReviewLine[]) {
  const bad = lines.filter(
    (l) =>
      l.selected &&
      l.action !== "ignore" &&
      (l.status === "erro" || l.errors.some((e) => e.toLowerCase().includes("obrigat"))),
  );
  if (bad.length) {
    throw new Error(
      `${bad.length} linha(s) com erro grave selecionada(s) — confirmação silenciosa bloqueada.`,
    );
  }
}

export function paginateReviewLines(
  lines: ImportReviewLine[],
  page: number,
  pageSize: number,
): { rows: ImportReviewLine[]; total: number; pageCount: number } {
  const size = Math.max(1, pageSize);
  const pageCount = Math.max(1, Math.ceil(lines.length / size));
  const safe = Math.min(Math.max(0, page), pageCount - 1);
  return {
    rows: lines.slice(safe * size, safe * size + size),
    total: lines.length,
    pageCount,
  };
}

/** Aplica alteração de um campo a linhas semelhantes (mesmo valor original). */
export function applyChangeToSimilarLines(
  lines: ImportReviewLine[],
  sourceRowNumber: number,
  fieldKey: string,
  newValue: unknown,
): ImportReviewLine[] {
  const source = lines.find((l) => l.rowNumber === sourceRowNumber);
  if (!source) return lines;
  const matchRaw = source.original[fieldKey];
  return lines.map((l) => {
    if (l.rowNumber === sourceRowNumber) {
      return {
        ...l,
        normalized: { ...l.normalized, [fieldKey]: newValue },
      };
    }
    if (l.original[fieldKey] === matchRaw) {
      return {
        ...l,
        normalized: { ...l.normalized, [fieldKey]: newValue },
        reason: `${l.reason} · alterado em lote (${fieldKey})`,
      };
    }
    return l;
  });
}

export function editReviewLine(
  lines: ImportReviewLine[],
  rowNumber: number,
  patch: Partial<Pick<ImportReviewLine, "normalized" | "action" | "productId" | "status">>,
): ImportReviewLine[] {
  return lines.map((l) =>
    l.rowNumber === rowNumber
      ? {
          ...l,
          ...patch,
          normalized: patch.normalized
            ? { ...l.normalized, ...patch.normalized }
            : l.normalized,
          status: patch.status ?? (l.status === "erro" ? "ok" : l.status),
          errors:
            patch.status === "ok" || patch.action === "ignore" ? [] : l.errors,
        }
      : l,
  );
}

/** Bridge a partir do ImportReviewRow da engine. */
export function fromEngineReviewRows(
  rows: Array<{
    rowNumber: number;
    values: Record<string, unknown>;
    classification: { status: string; confidence?: number; reason?: string };
    issues: Array<{ message: string }>;
    description?: string;
  }>,
): ImportReviewLine[] {
  return rows.map((r) => {
    const statusRaw = r.classification.status;
    let status: ImportReviewLineStatus = "ok";
    let action: ImportReviewLine["action"] = "create";
    if (statusRaw === "duplicate" || statusRaw === "duplicidade") {
      status = "duplicidade";
      action = "update";
    } else if (statusRaw === "error" || statusRaw === "erro") {
      status = "erro";
    } else if (statusRaw === "low_confidence" || statusRaw === "baixa_confianca") {
      status = "baixa_confianca";
    } else if (statusRaw === "update" || statusRaw === "atualizar") {
      status = "atualizar";
      action = "update";
    } else if (statusRaw === "new" || statusRaw === "novo" || statusRaw === "auto") {
      status = "novo";
      action = "create";
    }
    const confidence = Number(r.classification.confidence ?? 0.8);
    if (confidence < 0.6 && status === "ok") status = "baixa_confianca";
    return {
      rowNumber: r.rowNumber,
      status,
      action,
      original: r.values,
      normalized: { ...r.values },
      confidence,
      reason: r.classification.reason ?? r.description ?? "",
      productId: null,
      selected: status !== "erro",
      errors: r.issues.map((i) => i.message),
    };
  });
}

export function confirmedNumbersFromReview(
  lines: ImportReviewLine[],
): number[] {
  assertNoSilentErrorCommit(lines);
  return lines
    .filter((l) => l.selected && l.action !== "ignore")
    .map((l) => l.rowNumber);
}
