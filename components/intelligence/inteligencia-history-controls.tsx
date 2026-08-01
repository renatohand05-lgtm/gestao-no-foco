"use client";

import {
  archiveIntelligenceSessionAction,
  softDeleteIntelligenceSessionAction,
} from "@/lib/intelligence/enterprise/actions";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function InteligenciaHistoryControls({
  tenantId,
  sessionId,
}: {
  tenantId: string;
  sessionId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="flex gap-2 text-xs" data-history-controls="">
      <button
        type="button"
        disabled={pending}
        data-archive-session=""
        className="text-[var(--text-secondary)] hover:underline"
        onClick={() =>
          start(async () => {
            await archiveIntelligenceSessionAction({ tenantId, sessionId });
            router.refresh();
          })
        }
      >
        Arquivar
      </button>
      <button
        type="button"
        disabled={pending}
        data-soft-delete-session=""
        className="text-destructive hover:underline"
        onClick={() =>
          start(async () => {
            await softDeleteIntelligenceSessionAction({ tenantId, sessionId });
            router.refresh();
          })
        }
      >
        Excluir
      </button>
    </div>
  );
}
