/**
 * Executive Workspace — tipos (Sprint 12.1)
 * UX / produtividade. Sem I/O de negócio.
 */

export type WorkspaceCardDensity = "normal" | "compact" | "expandido" | "recolhido";

export type WorkspaceBlockId =
  | "hero"
  | "action_center"
  | "intelligence"
  | "business"
  | "prediction"
  | "timeline"
  | "copilot"
  | "action_plan"
  | "kpis"
  | "performance"
  | "monthly"
  | "daily"
  | "heatmap"
  | "rankings";

export type WorkspaceCommandKind =
  | "indicador"
  | "centro"
  | "cliente"
  | "venda"
  | "produto"
  | "acao"
  | "insight"
  | "ranking";

export type WorkspaceCommand = {
  id: string;
  kind: WorkspaceCommandKind;
  label: string;
  hint: string;
  shortcut?: string;
};

export type WorkspaceQuickActionId =
  | "nova_venda"
  | "nova_conta"
  | "nova_meta"
  | "novo_cliente"
  | "novo_produto"
  | "nova_categoria"
  | "exportar"
  | "compartilhar"
  | "imprimir";

export type WorkspaceQuickAction = {
  id: WorkspaceQuickActionId;
  label: string;
};

export type WorkspaceState = {
  focusMode: boolean;
  favorites: WorkspaceBlockId[];
  densities: Partial<Record<WorkspaceBlockId, WorkspaceCardDensity>>;
  commandOpen: boolean;
};

/** Blocos ocultos no Modo Foco (mantém decisão crítica). */
export const WORKSPACE_FOCUS_HIDDEN: WorkspaceBlockId[] = [
  "timeline",
  "heatmap",
  "rankings",
  "business",
  "intelligence",
  "copilot",
  "monthly",
  "daily",
];

/** Blocos mantidos no Modo Foco. */
export const WORKSPACE_FOCUS_KEEP: WorkspaceBlockId[] = [
  "hero",
  "action_center",
  "prediction",
  "action_plan",
  "kpis",
  "performance",
];
