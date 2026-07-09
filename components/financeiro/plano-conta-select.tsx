"use client";

import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";

import { FormField } from "@/components/ui/form-field";
import type { PlanoContaSelectOption } from "@/types/financeiro";

type PlanoContaSelectProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  options: PlanoContaSelectOption[];
  label?: string;
  hint?: string;
  required?: boolean;
  error?: string;
  onlySinteticaHint?: boolean;
};

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function PlanoContaSelect<T extends FieldValues>({
  control,
  name,
  options,
  label = "Conta pai",
  hint = "Opcional — selecione a conta sintética superior.",
  required,
  error,
  onlySinteticaHint,
}: PlanoContaSelectProps<T>) {
  return (
    <FormField
      label={label}
      htmlFor={String(name)}
      hint={
        onlySinteticaHint
          ? "Somente contas sintéticas podem ser selecionadas como pai."
          : hint
      }
      required={required}
      error={error}
    >
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <select
            id={String(name)}
            value={field.value ?? ""}
            onChange={(event) => field.onChange(event.target.value)}
            className={selectClassName}
          >
            <option value="">Nenhuma (conta raiz)</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {`${"— ".repeat(option.depth)}${option.label}`}
              </option>
            ))}
          </select>
        )}
      />
    </FormField>
  );
}
