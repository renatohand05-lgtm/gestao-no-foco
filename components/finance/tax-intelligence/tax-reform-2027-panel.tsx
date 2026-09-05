"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
https://github.com/renatohand05-lgtm/gestao-no-foco/new/mainimport {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import {
  applyTaxReform2027,
  type ApplyTaxReform2027RuleResult,
} from "@/lib/finance/tax-intelligence/tax-intelligence-actions";

type Props = {
  tenantSlug: string;
};

const REGIME_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "simples_nacional", label: "Simples Nacional" },
  { value: "lucro_presumido", label: "Lucro Presumido" },
  { value: "lucro_real", label: "Lucro Real" },
];

function statusBadge(status: string) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="size-3" />
        Ativa
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
      <AlertTriangle className="size-3" />
      Rascunho — revisar
    </span>
  );
}

export function TaxReform2027Panel({ tenantSlug }: Props) {
  const [regime, setRegime] = useState("simples_nacional");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    entityCreated: boolean;
    regimeNote: string | null;
    rules: ApplyTaxReform2027RuleResult[];
  } | null>(null);

  function handleApply() {
    setError(null);
    startTransition(async () => {
      const res = await applyTaxReform2027(
        tenantSlug,
        regime as Parameters<typeof applyTaxReform2027>[1],
      );
      if (!res.success) {
        setError(res.error);
        return;
      }
      setResult({
        entityCreated: res.entityCreated,
        regimeNote: res.regimeNote,
        rules: res.rules,
      });
    });
  }

  return (
    <Card className="border-[var(--brand-gold,#C9A84C)]/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-[var(--brand-gold,#C9A84C)]" />
          Reforma Tributária 2027
        </CardTitle>
        <CardDescription>
          Identifica o regime da empresa e prepara as regras de CBS e IBS
          vigentes a partir de 2027 — como rascunho, para revisão antes de
          ativar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <label
                htmlFor="tax-reform-regime"
                className="text-xs font-medium text-muted-foreground"
              >
                Regime tributário da empresa
              </label>
              <NativeSelect
                id="tax-reform-regime"
                value={regime}
                onChange={(e) => setRegime(e.target.value)}
              >
                {REGIME_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <Button type="button" onClick={handleApply} disabled={isPending}>
              {isPending ? "Aplicando…" : "Aplicar regras 2027"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {result.entityCreated
                ? "Empresa cadastrada como entidade fiscal e "
                : "Empresa já cadastrada — "}
              regras de 2027 preparadas abaixo.
            </p>

            <div className="space-y-3">
              {result.rules.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-lg border border-border/60 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {rule.versionLabel}
                    </p>
                    {statusBadge(rule.status)}
                  </div>
                  {rule.missingParameters.length > 0 ? (
                    <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                      Faltando confirmar: {rule.missingParameters.join(", ")}
                    </p>
                  ) : null}
                  {rule.notes ? (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {rule.notes}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            {result.regimeNote ? (
              <p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                {result.regimeNote}
              </p>
            ) : null}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setResult(null)}
            >
              Verificar de novo
            </Button>
          </div>
        )}

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
