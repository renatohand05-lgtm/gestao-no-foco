"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
import { buttonVariants } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import {
  applyDreGapSuggestionAction,
  applyDreGapSuggestionsBatchAction,
} from "@/lib/financeiro/actions";
import { formatCurrency, formatDateOnly } from "@/lib/financeiro/format";
import { cn } from "@/lib/utils";
import type { DreGap } from "@/types/dre";

type Props = {
  tenantSlug: string;
  gaps: DreGap[];
};

function origemLabel(origem: DreGap["origem"]) {
  if (origem === "venda") return "Venda";
  if (origem === "conta_receber") return "Conta a receber";
  return "Conta a pagar";
}

function campoLabel(campo: string) {
  if (campo === "dre_linha_indefinida") {
    return "Linha do DRE (pendente de classificação)";
  }
  return campo;
}

function corrigirHref(tenantSlug: string, gap: DreGap): string | null {
  if (gap.origem === "conta_pagar") {
    return `/${tenantSlug}/financeiro/contas-pagar/${gap.corrigir_id}/editar?classificacaoOnly=true`;
  }
  if (gap.origem === "conta_receber") {
    return `/${tenantSlug}/financeiro/contas-receber/${gap.corrigir_id}/editar?classificacaoOnly=true`;
  }
  if (gap.origem === "venda") {
    return `/${tenantSlug}/vendas/${gap.corrigir_id}/editar`;
  }
  return null;
}

export function DreGapsPanel({ tenantSlug, gaps }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const totalValor = gaps.reduce((acc, gap) => acc + Number(gap.valor), 0);
  const applyable = useMemo(
    () =>
      gaps.filter(
        (g) => g.sugestao && (g.categoria_id || g.plano_id),
      ),
    [gaps],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function applyOne(gap: DreGap) {
    if (!gap.sugestao) return;
    setMsg(null);
    startTransition(async () => {
      const result = await applyDreGapSuggestionAction(tenantSlug, {
        categoriaId: gap.categoria_id ?? null,
        planoId: gap.plano_id ?? null,
        linha: gap.sugestao!.linha,
        detalhe: gap.sugestao!.detalhe,
        origem: "sugestao_nome",
      });
      if (!result.success) {
        setMsg(result.error);
        return;
      }
      setMsg("Sugestão aplicada (apenas onde ainda estava vazia).");
      router.refresh();
    });
  }

  function applyBatch() {
    const ids = applyable
      .filter((g) => selected.has(`${g.origem}-${g.id}`))
      .map((g) => ({
        categoriaId: g.categoria_id ?? null,
        planoId: g.plano_id ?? null,
        linha: g.sugestao!.linha,
        detalhe: g.sugestao!.detalhe,
      }));
    if (ids.length === 0) {
      setMsg("Selecione pendências com sugestão e categoria/plano.");
      return;
    }
    setMsg(null);
    startTransition(async () => {
      const result = await applyDreGapSuggestionsBatchAction(tenantSlug, ids);
      if (!result.success) {
        setMsg(result.error);
        return;
      }
      setMsg(`Lote aplicado: ${result.updated ?? 0} classificação(ões).`);
      setSelected(new Set());
      router.refresh();
    });
  }

  if (gaps.length === 0) {
    return (
      <SectionCard
        title="Pendente de classificação"
        description="Lançamentos do período sem linha do DRE definida"
      >
        <p className="text-sm text-muted-foreground">
          Nenhuma pendência de classificação no período e filtros atuais.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Pendente de classificação"
      description={`${gaps.length} lançamento${gaps.length === 1 ? "" : "s"} · ${formatCurrency(totalValor)} fora do DRE`}
    >
      <div className="mb-4 space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        <p>
          Estes valores <strong>não entram</strong> em nenhuma linha do DRE.
          Sugestões usam o nome da categoria/descrição — confirme antes de
          aplicar. Nada é aplicado automaticamente.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            onClick={applyBatch}
          >
            Aplicar selecionados em lote
          </button>
          <button
            type="button"
            disabled={pending}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            onClick={() =>
              setSelected(
                new Set(applyable.map((g) => `${g.origem}-${g.id}`)),
              )
            }
          >
            Selecionar com sugestão
          </button>
        </div>
        {msg ? <p className="text-xs">{msg}</p> : null}
      </div>

      <DataTable>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Origem</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="hidden lg:table-cell">Sugestão</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gaps.map((gap) => {
              const key = `${gap.origem}-${gap.id}`;
              const href = corrigirHref(tenantSlug, gap);
              return (
                <TableRow key={key}>
                  <TableCell>
                    {gap.sugestao && (gap.categoria_id || gap.plano_id) ? (
                      <input
                        type="checkbox"
                        checked={selected.has(key)}
                        onChange={() => toggle(key)}
                        aria-label="Selecionar"
                      />
                    ) : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {origemLabel(gap.origem)}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{gap.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateOnly(gap.data_competencia)} ·{" "}
                      {gap.campos_faltantes.map(campoLabel).join(", ")}
                    </p>
                    <p className="text-xs text-muted-foreground lg:hidden">
                      {gap.sugestao?.pathLabel ?? "Sem sugestão automática"}
                    </p>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">
                    {gap.sugestao ? (
                      <div>
                        <p>{gap.sugestao.pathLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          Origem: {gap.sugestao.origem}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(gap.valor)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap justify-end gap-1">
                      {gap.sugestao && (gap.categoria_id || gap.plano_id) ? (
                        <button
                          type="button"
                          disabled={pending}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                          )}
                          onClick={() => applyOne(gap)}
                        >
                          Aplicar
                        </button>
                      ) : null}
                      {href ? (
                        <Link
                          href={href}
                          className={cn(
                            buttonVariants({ variant: "ghost", size: "sm" }),
                          )}
                        >
                          Corrigir
                        </Link>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DataTable>
    </SectionCard>
  );
}
