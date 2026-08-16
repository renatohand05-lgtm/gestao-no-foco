"use client";

import {
  MECANICO_ESPECIALIDADE_LABELS,
  MECANICO_ESPECIALIDADES,
  type MecanicoEspecialidade,
} from "@/lib/mecanicos/constants";

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

  const listId = "professional-specialty-suggestions";
  return (
    <div className="space-y-1">
      <input
        className="h-9 w-full rounded-md border border-input bg-transparent px-2"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        list={suggestions.length > 0 ? listId : undefined}
        placeholder="Especialidade"
      />
      {suggestions.length > 0 ? (
        <datalist id={listId}>
          {suggestions.map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Escolha uma sugestão ou escreva um valor personalizado.
      </p>
    </div>
  );
}
