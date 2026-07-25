"use client";

import { ExecutiveEmptyState } from "@/components/executive";

type Props = {
  className?: string;
};

export function ExecutiveTimelineEmptyState({ className }: Props) {
  return (
    <ExecutiveEmptyState
      title="Sem eventos na timeline"
      description="Não há eventos com evidência suficiente no snapshot atual, ou os filtros ocultaram todos os itens."
      className={className}
    />
  );
}
