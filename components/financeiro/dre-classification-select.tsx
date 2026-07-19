"use client";

import { useMemo } from "react";
import type { UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";

import { FormField } from "@/components/ui/form-field";
import {
  buildDreClassificationSelectOptions,
  encodeDreClassification,
  decodeDreClassification,
} from "@/lib/dre";

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  watch: UseFormWatch<any>;
  hint?: string;
};

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function DreClassificationSelect({
  setValue,
  watch,
  hint = "Grupo > subgrupo > linha. Não classifica aluguel/utilidades como investimento.",
}: Props) {
  const options = useMemo(() => buildDreClassificationSelectOptions(), []);
  const linha = watch("dre_linha") as string;
  const detalhe = watch("dre_detalhe") as string;
  const value = encodeDreClassification(linha, detalhe);

  return (
    <FormField
      label="Classificação DRE"
      htmlFor="dre_classification"
      hint={hint}
      className="md:col-span-2"
    >
      <select
        id="dre_classification"
        className={selectClassName}
        value={value}
        onChange={(event) => {
          const decoded = decodeDreClassification(event.target.value);
          setValue("dre_linha", decoded.linha, { shouldDirty: true });
          setValue("dre_detalhe", decoded.detalhe, { shouldDirty: true });
        }}
      >
        <option value="">Sem classificação / herdar</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}
