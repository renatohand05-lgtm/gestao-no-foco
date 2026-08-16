"use client";

import {
  MECANICO_ESPECIALIDADE_LABELS,
  MECANICO_ESPECIALIDADES,
  type MecanicoEspecialidade,
} from "@/lib/mecanicos/constants";
import { OPERATIONAL_AUTOCOMPLETE_PROPS } from "@/lib/ux/browser-autocomplete";

type Props = {
  value: string;
  onChange: (value: string) => void;
  automotive: boolean;
  suggestions: string[];
  disabled?: boolean;
};

export function ProfessionalSpecialtyField({
  value,
  onChange,
  automotive,
  suggestions,
  disabled = false,
}: Props) {
  if (automotive) {
    return (
      <select
        className="h-9 w-full rounded-md border border-input bg-transparent px-2"
        value={value}
        disabled={disabled}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
      >
        {MECANICO_ESPECIALIDADES.map((item) => (
          <option key={item} value={item}>
            {MECANICO_ESPECIALIDADE_LABELS[item as MecanicoEspecialidade]}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="space-y-1">
      <input
        className="h-9 w-full rounded-md border border-input bg-transparent px-2"
        value={value}
        disabled={disabled}
        placeholder="Especialidade"
        name="gestoo-professional-specialty"
        {...OPERATIONAL_AUTOCOMPLETE_PROPS}
        onChange={(event) => onChange(event.target.value)}
      />
      {suggestions.length > 0 ? (
        <ul className="flex flex-wrap gap-1" data-fast-input="specialty-suggest">
          {suggestions.map((item) => (
            <li key={item}>
              <button
                type="button"
                disabled={disabled}
                className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                onClick={() => onChange(item)}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Escolha uma sugestão ou escreva um valor personalizado.
      </p>
    </div>
  );
}
