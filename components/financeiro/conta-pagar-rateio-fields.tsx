"use client";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ContaPagarFormValues } from "@/lib/financeiro/validations";
import type { CentroCustoOption } from "@/types/contas-pagar";

type Props = {
  centrosCusto: CentroCustoOption[];
  disabled?: boolean;
};

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60";

export function ContaPagarRateioFields({ centrosCusto, disabled }: Props) {
  const form = useFormContext<ContaPagarFormValues>();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "rateios",
  });
  const rateios = useWatch({ control: form.control, name: "rateios" }) ?? [];
  const soma = rateios.reduce(
    (acc, line) => acc + (Number(line.percentual) || 0),
    0,
  );
  const restante = Math.round((100 - soma) * 10000) / 10000;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Rateio por centro de custo</p>
          <p className="text-xs text-muted-foreground">
            Opcional. Se preenchido, a soma deve ser exatamente 100%.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          onClick={() =>
            append({
              centro_custo_id: "",
              percentual: restante > 0 ? restante : 0,
              descricao: "",
            })
          }
        >
          Adicionar linha
        </button>
        {fields.length > 0 ? (
          <button
            type="button"
            disabled={disabled}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            onClick={() => {
              const last = rateios[rateios.length - 1];
              append({
                centro_custo_id: last?.centro_custo_id ?? "",
                percentual: 0,
                descricao: last?.descricao ?? "",
              });
            }}
          >
            Duplicar última
          </button>
        ) : null}
      </div>

      <p
        className={cn(
          "rounded-md border px-3 py-2 text-sm tabular-nums",
          Math.abs(restante) < 0.0001
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-amber-200 bg-amber-50 text-amber-950",
        )}
      >
        Soma: {soma.toFixed(2)}% · Restante até 100%:{" "}
        <strong>{restante.toFixed(2)}%</strong>
      </p>

      {form.formState.errors.rateios?.message ? (
        <p className="text-sm text-destructive">
          {String(form.formState.errors.rateios.message)}
        </p>
      ) : null}

      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sem rateio — usa o centro de custo principal da conta.
        </p>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-3 rounded-lg border border-border/70 p-3 sm:grid-cols-[1.4fr_0.7fr_1fr_auto]"
            >
              <FormField
                label="Centro"
                htmlFor={`rateios.${index}.centro_custo_id`}
                required
              >
                <select
                  id={`rateios.${index}.centro_custo_id`}
                  {...form.register(`rateios.${index}.centro_custo_id`)}
                  className={selectClassName}
                  disabled={disabled}
                >
                  <option value="">Selecione</option>
                  {centrosCusto.map((centro) => (
                    <option key={centro.id} value={centro.id}>
                      {centro.codigo} · {centro.nome}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField
                label="%"
                htmlFor={`rateios.${index}.percentual`}
                required
              >
                <Input
                  id={`rateios.${index}.percentual`}
                  type="number"
                  step="0.01"
                  min={0.01}
                  max={100}
                  disabled={disabled}
                  {...form.register(`rateios.${index}.percentual`, {
                    valueAsNumber: true,
                  })}
                />
              </FormField>

              <FormField
                label="Descrição"
                htmlFor={`rateios.${index}.descricao`}
              >
                <Input
                  id={`rateios.${index}.descricao`}
                  disabled={disabled}
                  {...form.register(`rateios.${index}.descricao`)}
                  placeholder="Opcional"
                />
              </FormField>

              <div className="flex items-end">
                <button
                  type="button"
                  disabled={disabled}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "text-destructive",
                  )}
                  onClick={() => remove(index)}
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
