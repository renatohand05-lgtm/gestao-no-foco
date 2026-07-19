"use client";

import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ScenarioMetric,
  formatScenarioMoney,
  formatScenarioPct,
  formatScenarioSignedMoney,
} from "@/components/executive/predictions/scenario-metric";
import { exAnimations, exTypography } from "@/lib/design-system";
import {
  PREDICTION_DEFAULT_SIMULATOR,
  runCustomSimulations,
} from "@/lib/predictions";
import { cn } from "@/lib/utils";
import type { PredictionInput, SimulatorParams } from "@/lib/predictions/types";

type Props = {
  input: PredictionInput;
};

const INITIAL: SimulatorParams = { ...PREDICTION_DEFAULT_SIMULATOR };

function Field({
  id,
  label,
  hint,
  value,
  onChange,
  min,
  step,
  error,
}: {
  id: string;
  label: string;
  hint: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  step?: number;
  error?: string;
}) {
  const hintId = `${id}-hint`;
  const errId = `${id}-error`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        step={step ?? 1}
        aria-describedby={`${hintId}${error ? ` ${errId}` : ""}`}
        aria-invalid={Boolean(error) || undefined}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          "flex h-10 w-full rounded-xl border border-border/60 bg-background px-3 text-sm tabular-nums",
          exAnimations.focusRing,
          error && "border-destructive",
        )}
      />
      <p id={hintId} className={exTypography.caption}>
        {hint}
      </p>
      {error ? (
        <p id={errId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ScenarioSimulator({ input }: Props) {
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [params, setParams] = useState<SimulatorParams>(INITIAL);
  const [errors, setErrors] = useState<
    Partial<Record<keyof SimulatorParams, string>>
  >({});

  const results = runCustomSimulations(input, params);

  function validate(next: SimulatorParams) {
    const e: Partial<Record<keyof SimulatorParams, string>> = {};
    if (next.dailyAbsoluteDelta < -input.mediaDiariaAtual) {
      e.dailyAbsoluteDelta = "Não pode reduzir a média diária abaixo de zero.";
    }
    if (next.ticketAbsoluteDelta < -input.ticketAtual) {
      e.ticketAbsoluteDelta = "Não pode reduzir o ticket abaixo de zero.";
    }
    if (next.recoveryDays < 0) e.recoveryDays = "Dias não podem ser negativos.";
    if (next.recoveryDays > input.diasUteisRestantes) {
      e.recoveryDays = `Máximo de ${input.diasUteisRestantes} dia(s) restante(s).`;
    }
    if (next.recoveryLiftPercent < 0) {
      e.recoveryLiftPercent = "Percentual de lift não pode ser negativo.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function onRestore() {
    setParams(INITIAL);
    setErrors({});
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    validate(params);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn("rounded-xl", exAnimations.focusRing)}
          />
        }
      >
        Abrir simulador
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Simulador de cenários</DialogTitle>
          <DialogDescription>
            Alterações locais apenas — não grava no banco e não faz fetch.
          </DialogDescription>
        </DialogHeader>

        <form
          id={formId}
          onSubmit={onSubmit}
          className="mt-4 space-y-4"
          noValidate
        >
          <Field
            id={`${formId}-daily-abs`}
            label="Δ média diária (R$)"
            hint="Valor absoluto por dia útil. Use 0 para aplicar o %."
            value={params.dailyAbsoluteDelta}
            onChange={(n) =>
              setParams((p) => {
                const next = { ...p, dailyAbsoluteDelta: n };
                validate(next);
                return next;
              })
            }
            error={errors.dailyAbsoluteDelta}
          />
          <Field
            id={`${formId}-daily-pct`}
            label="Δ média diária (%)"
            hint="Usado quando o delta absoluto é 0."
            value={params.dailyPercentDelta}
            onChange={(n) =>
              setParams((p) => ({ ...p, dailyPercentDelta: n }))
            }
            step={0.5}
          />
          <Field
            id={`${formId}-ticket-abs`}
            label="Δ ticket (R$)"
            hint="Valor absoluto. Use 0 para aplicar o %."
            value={params.ticketAbsoluteDelta}
            onChange={(n) =>
              setParams((p) => {
                const next = { ...p, ticketAbsoluteDelta: n };
                validate(next);
                return next;
              })
            }
            error={errors.ticketAbsoluteDelta}
          />
          <Field
            id={`${formId}-ticket-pct`}
            label="Δ ticket (%)"
            hint="Usado quando o delta absoluto é 0."
            value={params.ticketPercentDelta}
            onChange={(n) =>
              setParams((p) => ({ ...p, ticketPercentDelta: n }))
            }
            step={0.5}
          />
          <Field
            id={`${formId}-recovery-days`}
            label="Dias de recuperação"
            hint="Dias consecutivos acima da meta diária."
            value={params.recoveryDays}
            min={0}
            onChange={(n) =>
              setParams((p) => {
                const next = { ...p, recoveryDays: n };
                validate(next);
                return next;
              })
            }
            error={errors.recoveryDays}
          />
          <Field
            id={`${formId}-recovery-lift`}
            label="% acima da meta diária"
            hint="Lift percentual sobre necessário/dia (ou média)."
            value={params.recoveryLiftPercent}
            min={0}
            onChange={(n) =>
              setParams((p) => {
                const next = { ...p, recoveryLiftPercent: n };
                validate(next);
                return next;
              })
            }
            error={errors.recoveryLiftPercent}
          />

          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="rounded-xl">
              Comparar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={onRestore}
            >
              Restaurar cenário
            </Button>
          </div>
        </form>

        <div className="mt-6 space-y-4 border-t border-border/40 pt-4 motion-reduce:transition-none">
          <p className="text-sm font-semibold">Resultados locais</p>
          <div className="rounded-xl border border-border/40 p-3">
            <p className={exTypography.label}>Média diária</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <ScenarioMetric
                label="Nova média"
                value={formatScenarioMoney(results.daily.newDailyAverage)}
              />
              <ScenarioMetric
                label="Projeção"
                value={formatScenarioMoney(results.daily.projectedRevenue)}
              />
              <ScenarioMetric
                label="Incremento"
                value={formatScenarioSignedMoney(
                  results.daily.estimatedIncrement,
                )}
              />
              <ScenarioMetric
                label="Atingimento"
                value={formatScenarioPct(results.daily.projectedAttainment)}
              />
            </div>
            <p className={cn("mt-2", exTypography.caption)}>
              {results.daily.assumption}
            </p>
          </div>
          <div className="rounded-xl border border-border/40 p-3">
            <p className={exTypography.label}>Ticket</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <ScenarioMetric
                label="Novo ticket"
                value={formatScenarioMoney(results.ticket.newTicket)}
              />
              <ScenarioMetric
                label="Receita est."
                value={formatScenarioMoney(results.ticket.estimatedRevenue)}
              />
              <ScenarioMetric
                label="Incremento"
                value={formatScenarioSignedMoney(
                  results.ticket.estimatedIncrement,
                )}
              />
              <ScenarioMetric
                label="Atingimento"
                value={formatScenarioPct(results.ticket.projectedAttainment)}
              />
            </div>
            <p className={cn("mt-2", exTypography.caption)}>
              {results.ticket.assumption}
            </p>
          </div>
          <div className="rounded-xl border border-border/40 p-3">
            <p className={exTypography.label}>Recuperação</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <ScenarioMetric
                label="Dias"
                value={String(results.recovery.recoveredDays)}
              />
              <ScenarioMetric
                label="Projeção"
                value={formatScenarioMoney(results.recovery.projectedRevenue)}
              />
              <ScenarioMetric
                label="Incremento"
                value={formatScenarioSignedMoney(
                  results.recovery.estimatedIncrement,
                )}
              />
              <ScenarioMetric
                label="Atingimento"
                value={formatScenarioPct(results.recovery.projectedAttainment)}
              />
            </div>
            <p className={cn("mt-2", exTypography.caption)}>
              {results.recovery.assumption}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
