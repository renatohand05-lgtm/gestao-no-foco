"use client";

import { useMemo } from "react";
import type { UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";

import { FormField } from "@/components/ui/form-field";
import { gofControl } from "@/lib/design-system";
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
        className={gofControl}
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
