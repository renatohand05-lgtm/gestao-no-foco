"use client";

import { ActionTaskItem } from "@/components/executive/action-plan/action-task";
import type { ActionTask } from "@/lib/action-plan";

type Props = {
  task: ActionTask;
  completed: boolean;
  onComplete: () => void;
  index: number;
};

/** Alias de card premium por tarefa. */
export function ActionPlanCard(props: Props) {
  return <ActionTaskItem {...props} />;
}
