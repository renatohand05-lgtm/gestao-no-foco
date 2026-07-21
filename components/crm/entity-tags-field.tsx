"use client";

import { Controller, useFormContext } from "react-hook-form";

import { FormField } from "@/components/ui/form-field";
import type { ClienteFormValues } from "@/lib/clientes/validations";
import type { TagRecord } from "@/lib/master-data/master-data-types";
import { cn } from "@/lib/utils";

type EntityTagsFieldProps = {
  tags: TagRecord[];
};

export function EntityTagsField({ tags }: EntityTagsFieldProps) {
  const form = useFormContext<ClienteFormValues>();

  return (
    <FormField label="Etiquetas" htmlFor="tag_ids">
      <Controller
        control={form.control}
        name="tag_ids"
        render={({ field }) => (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const selected = (field.value ?? []).includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    const current = field.value ?? [];
                    field.onChange(
                      selected
                        ? current.filter((id) => id !== tag.id)
                        : [...current, tag.id],
                    );
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                  )}
                  style={
                    selected && tag.cor
                      ? { borderColor: tag.cor, color: tag.cor }
                      : undefined
                  }
                >
                  {tag.nome}
                </button>
              );
            })}
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma etiqueta cadastrada. Salve o cliente para usar as etiquetas padrão do CRM.
              </p>
            ) : null}
          </div>
        )}
      />
    </FormField>
  );
}
