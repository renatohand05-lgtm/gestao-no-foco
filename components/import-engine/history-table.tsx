"use client";

/**
 * Sprint 22.5.1 — Tabela de histórico compartilhada pela Import Engine.
 * Movido de components/finance/import/import-history-table.tsx (Sprint 22.5),
 * que agora reexporta este componente.
 */
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ImportHistoryEntry } from "@/lib/import-engine";

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function statusVariant(
  status: ImportHistoryEntry["status"],
): "success" | "warning" | "destructive" | "outline" {
  if (status === "completed") return "success";
  if (status === "partial") return "warning";
  if (status === "failed") return "destructive";
  return "outline";
}

type Props = {
  history: ImportHistoryEntry[];
};

export function ImportHistoryTable({ history }: Props) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-import-history="empty">
        Nenhuma importação registada ainda.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/50" data-import-history>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Arquivo</TableHead>
            <TableHead>Utilizador</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Linhas</TableHead>
            <TableHead className="text-right">Importadas</TableHead>
            <TableHead className="text-right">Erros</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((h) => (
            <TableRow key={h.id}>
              <TableCell className="whitespace-nowrap text-xs">
                {formatDate(h.createdAt)}
              </TableCell>
              <TableCell className="max-w-[220px] truncate text-sm">
                {h.fileName}
                <span className="ml-1 text-[10px] uppercase text-muted-foreground">
                  {h.format}
                </span>
              </TableCell>
              <TableCell className="text-sm">{h.userLabel}</TableCell>
              <TableCell>
                <Badge variant={statusVariant(h.status)}>{h.status}</Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">{h.totalRows}</TableCell>
              <TableCell className="text-right tabular-nums">
                {h.importedRows}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {h.errorCount}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
