"use client";

import { WorkflowActionList } from "@/components/workflow/workflow-action-list";
import { WorkflowHistory } from "@/components/workflow/workflow-history";
import { WorkflowStateBadge } from "@/components/workflow/workflow-state-badge";
import { WorkflowStatusBadge } from "@/components/workflow/workflow-status-badge";
import type { WorkflowDefinition, WorkflowInstance } from "@/lib/workflow";
import { gofTypography } from "@/lib/design-system";
import { cn } from "@/lib/utils";

type Props = {
  instance: WorkflowInstance;
  definition?: WorkflowDefinition | null;
  className?: string;
};

export function WorkflowDetails({
  instance,
  definition,
  className,
}: Props) {
  const stateName = definition?.states.find(
    (s) => s.id === instance.currentState,
  )?.name;

  return (
    <article
      data-workflow-details
      className={cn(
        "space-y-4 rounded-xl border border-border/60 bg-[var(--brand-white)] p-4 sm:p-5",
        className,
      )}
    >
      <header className="space-y-2">
        <p className={gofTypography.caption}>
          {instance.workflowId}@{instance.workflowVersion}
        </p>
        <h2 className={cn(gofTypography.title, "text-lg")}>
          Instância {instance.id}
        </h2>
        <div className="flex flex-wrap gap-1.5">
          <WorkflowStatusBadge status={instance.status} />
          <WorkflowStateBadge
            stateId={instance.currentState}
            stateName={stateName}
          />
        </div>
      </header>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className={gofTypography.caption}>Tenant</dt>
          <dd className="break-all font-medium">{instance.tenantId ?? "—"}</dd>
        </div>
        <div>
          <dt className={gofTypography.caption}>Transições</dt>
          <dd className="font-medium">{instance.transitionCount}</dd>
        </div>
        <div>
          <dt className={gofTypography.caption}>Criado</dt>
          <dd className="font-medium">{instance.createdAt}</dd>
        </div>
        <div>
          <dt className={gofTypography.caption}>Atualizado</dt>
          <dd className="font-medium">{instance.updatedAt}</dd>
        </div>
      </dl>

      <section className="space-y-2">
        <h3 className={cn(gofTypography.title, "text-sm")}>Ações pendentes</h3>
        <WorkflowActionList actions={instance.pendingActions} />
      </section>

      <section className="space-y-2">
        <h3 className={cn(gofTypography.title, "text-sm")}>Histórico</h3>
        <WorkflowHistory instance={instance} />
      </section>
    </article>
  );
}
