"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { fecharContagemAction } from "@/lib/estoque/estoque-contagem-actions";
import { formatCurrency } from "@/lib/format";
import type { FecharContagemResult } from "@/types/estoque-contagem";

export function FecharContagemButton({
  tenantSlug,
  contagemId,
  itensSemContagem,
}: {
  tenantSlug: string;
  contagemId: string;
  itensSemContagem: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<FecharContagemResult | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFechar() {
    setError(null);
    startTransition(async () => {
      const result = await fecharContagemAction(tenantSlug, contagemId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setResultado(result.resultado);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setResultado(null);
      }}
    >
      <DialogTrigger render={<Button />}>
        <Lock className="size-4" aria-hidden />
        Fechar contagem
      </DialogTrigger>
      <DialogContent>
        {resultado ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-success" aria-hidden />
                Contagem fechada
              </DialogTitle>
              <DialogDescription>
                O estoque já foi ajustado pra bater com a contagem física.
              </DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border/50 px-3 py-2">
                <dt className="text-[10px] uppercase text-[var(--text-muted)]">
                  Itens ajustados
                </dt>
                <dd className="font-semibold">{resultado.itensAjustados}</dd>
              </div>
              <div className="rounded-lg border border-border/50 px-3 py-2">
                <dt className="text-[10px] uppercase text-[var(--text-muted)]">
                  Perdas apuradas
                </dt>
                <dd className="font-semibold text-danger">
                  {formatCurrency(resultado.perdasValor)}
                </dd>
              </div>
              <div className="rounded-lg border border-border/50 px-3 py-2">
                <dt className="text-[10px] uppercase text-[var(--text-muted)]">
                  Sobras apuradas
                </dt>
                <dd className="font-semibold text-success">
                  {formatCurrency(resultado.sobrasValor)}
                </dd>
              </div>
              <div className="rounded-lg border border-border/50 px-3 py-2">
                <dt className="text-[10px] uppercase text-[var(--text-muted)]">
                  CMV sugerido
                </dt>
                <dd className="font-semibold">
                  {formatCurrency(resultado.cmvSugerido)}
                </dd>
              </div>
            </dl>
            {resultado.itensSemContagem > 0 ? (
              <FeedbackMessage variant="info">
                {resultado.itensSemContagem} item(ns) não foram contados e
                ficaram sem alteração no estoque.
              </FeedbackMessage>
            ) : null}
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>Fechar</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Fechar esta contagem?</DialogTitle>
              <DialogDescription>
                Todo item com diferença entre o sistema e a contagem física
                vai gerar um ajuste real de estoque. Depois de fechada, essa
                contagem não pode mais ser editada.
              </DialogDescription>
            </DialogHeader>
            {itensSemContagem > 0 ? (
              <FeedbackMessage variant="warning">
                {itensSemContagem} produto(s) ainda não foram contados — eles
                vão ficar sem alteração no estoque.
              </FeedbackMessage>
            ) : null}
            {error ? (
              <FeedbackMessage variant="error">{error}</FeedbackMessage>
            ) : null}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button onClick={handleFechar} disabled={pending}>
                {pending ? "Fechando…" : "Confirmar e fechar"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
