"use client";

/**
 * Sprint 25.4.3 — Revisão linha a linha (confirmação sem erro silencioso).
 */

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  assertNoSilentErrorCommit,
  filterReviewLines,
  ignoreReviewLine,
  paginateReviewLines,
  selectAllReviewLines,
  toggleReviewLine,
  type ImportReviewFilter,
  type ImportReviewLine,
} from "@/lib/import-engine/review/row-review";

type Props = {
  lines: ImportReviewLine[];
  onChange: (lines: ImportReviewLine[]) => void;
  pageSize?: number;
};

export function ImportRowReviewClient({
  lines,
  onChange,
  pageSize = 50,
}: Props) {
  const [filter, setFilter] = useState<ImportReviewFilter>("all");
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(
    () => filterReviewLines(lines, filter),
    [lines, filter],
  );
  const pageData = useMemo(
    () => paginateReviewLines(filtered, page, pageSize),
    [filtered, page, pageSize],
  );

  function validateSelection() {
    setError(null);
    try {
      assertNoSilentErrorCommit(lines);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Seleção inválida");
    }
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label>Filtro</Label>
          <select
            className="flex h-10 rounded-md border px-3 text-sm"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value as ImportReviewFilter);
              setPage(0);
            }}
            aria-label="Filtro de revisão"
          >
            <option value="all">Todas</option>
            <option value="erros">Erros</option>
            <option value="duplicidades">Duplicidades</option>
            <option value="baixa_confianca">Baixa confiança</option>
            <option value="novos">Novos</option>
            <option value="atualizados">Atualizados</option>
            <option value="selecionados">Selecionados</option>
          </select>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange(selectAllReviewLines(lines, true))}
        >
          Selecionar todas
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onChange(selectAllReviewLines(lines, false))}
        >
          Limpar seleção
        </Button>
        <Button type="button" variant="secondary" onClick={validateSelection}>
          Validar seleção
        </Button>
      </div>

      <div className="overflow-x-auto max-h-[420px]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="text-left text-muted-foreground">
              <th className="p-1">Sel.</th>
              <th className="p-1">#</th>
              <th className="p-1">Status</th>
              <th className="p-1">Ação</th>
              <th className="p-1">Confiança</th>
              <th className="p-1">Motivo</th>
              <th className="p-1" />
            </tr>
          </thead>
          <tbody>
            {pageData.rows.map((row) => (
              <tr key={row.rowNumber} className="border-t align-top">
                <td className="p-1">
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={(e) =>
                      onChange(
                        toggleReviewLine(lines, row.rowNumber, e.target.checked),
                      )
                    }
                    aria-label={`Selecionar linha ${row.rowNumber}`}
                  />
                </td>
                <td className="p-1 tabular-nums">{row.rowNumber}</td>
                <td className="p-1">{row.status}</td>
                <td className="p-1">{row.action}</td>
                <td className="p-1 tabular-nums">
                  {(row.confidence * 100).toFixed(0)}%
                </td>
                <td className="p-1 text-xs">
                  {row.reason || "—"}
                  {row.errors.length ? (
                    <div className="text-destructive">
                      {row.errors.join("; ")}
                    </div>
                  ) : null}
                </td>
                <td className="p-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      onChange(ignoreReviewLine(lines, row.rowNumber))
                    }
                  >
                    Ignorar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <Button
          type="button"
          variant="outline"
          disabled={page <= 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Anterior
        </Button>
        <span>
          Página {page + 1}/{pageData.pageCount} · {pageData.total} linha(s)
        </span>
        <Button
          type="button"
          variant="outline"
          disabled={page + 1 >= pageData.pageCount}
          onClick={() => setPage((p) => p + 1)}
        >
          Próxima
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
