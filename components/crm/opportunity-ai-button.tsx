"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { analyzeOpportunityAction } from "@/lib/crm/opportunity-insight-actions";

type Props = {
  tenantSlug: string;
  oportunidadeId: string;
};

export function OpportunityAiButton({ tenantSlug, oportunidadeId }: Props) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{
    probabilidade: number;
    proximaAcao: string;
    justificativa: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAnalyze() {
    setOpen(true);
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await analyzeOpportunityAction(tenantSlug, oportunidadeId);
      if (!res.success) {
        setError(res.error);
        return;
      }
      setResult(res.insight);
    });
  }

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={handleAnalyze}>
        <Sparkles className="mr-1 size-3.5" />
        IA
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Análise da oportunidade</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            {isPending ? (
              <p className="text-muted-foreground">Analisando…</p>
            ) : error ? (
              <p className="text-red-600" role="alert">
                {error}
              </p>
            ) : result ? (
              <>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Probabilidade de fechamento
                  </p>
                  <p className="text-2xl font-semibold">{result.probabilidade}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Próxima ação sugerida</p>
                  <p className="font-medium">{result.proximaAcao}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Por quê</p>
                  <p className="text-muted-foreground">{result.justificativa}</p>
                </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
