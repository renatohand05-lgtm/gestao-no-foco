"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { updateDiasOperacaoAction } from "@/lib/tenants/dias-operacao-actions";
import { DIA_SEMANA_LABELS_CURTOS } from "@/lib/tenants/dias-operacao";
import { cn } from "@/lib/utils";

const ORDEM_EXIBICAO = [1, 2, 3, 4, 5, 6, 0]; // segunda a domingo, visualmente mais natural

type Props = {
  tenantSlug: string;
  diasOperacaoAtuais: number[];
  canManage: boolean;
};

export function DiasOperacaoForm({
  tenantSlug,
  diasOperacaoAtuais,
  canManage,
}: Props) {
  const [selecionados, setSelecionados] = useState<Set<number>>(
    new Set(diasOperacaoAtuais),
  );
  const [salvo, setSalvo] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(dia: number) {
    if (!canManage) return;
    setSalvo(false);
    setSelecionados((prev) => {
      const next = new Set(prev);
      if (next.has(dia)) next.delete(dia);
      else next.add(dia);
      return next;
    });
  }

  function handleSalvar() {
    if (selecionados.size === 0) {
      setError("Selecione ao menos um dia.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateDiasOperacaoAction(
        tenantSlug,
        [...selecionados],
      );
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSalvo(true);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {ORDEM_EXIBICAO.map((dia) => {
          const ativo = selecionados.has(dia);
          return (
            <button
              key={dia}
              type="button"
              disabled={!canManage || pending}
              onClick={() => toggle(dia)}
              className={cn(
                "flex h-9 w-14 items-center justify-center rounded-lg border text-xs font-medium transition-colors",
                ativo
                  ? "border-[var(--brand-gold)] bg-[var(--brand-gold)]/15 text-[var(--brand-gold)]"
                  : "border-border/50 text-muted-foreground hover:border-border",
                (!canManage || pending) && "cursor-not-allowed opacity-60",
              )}
            >
              {DIA_SEMANA_LABELS_CURTOS[dia]}
            </button>
          );
        })}
      </div>

      {canManage ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleSalvar}
            disabled={pending || salvo}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : salvo ? (
              <Check className="size-3.5" aria-hidden />
            ) : null}
            {salvo ? "Salvo" : "Salvar dias de operação"}
          </Button>
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Usado pra calcular a meta diária e a projeção de fechamento do mês —
        dias fora dessa seleção contam meta R$ 0,00 e não entram no rateio.
      </p>
      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
    </div>
  );
}
