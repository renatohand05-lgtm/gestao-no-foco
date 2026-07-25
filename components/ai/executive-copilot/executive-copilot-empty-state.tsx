"use client";

import { ExecutiveEmptyState } from "@/components/executive";

type Props = {
  className?: string;
};

export function ExecutiveCopilotEmptyState({ className }: Props) {
  return (
    <ExecutiveEmptyState
      title="Copiloto Executivo"
      description="Escolha uma sugestão ou faça uma pergunta suportada. Respostas baseadas apenas em evidências do tenant."
      className={className}
    />
  );
}
