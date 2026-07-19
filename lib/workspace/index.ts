/**
 * Executive Workspace — Sprint 12.1
 */

export {
  listWorkspaceCommands,
  listWorkspaceQuickActions,
  listFabActions,
  isBlockHiddenInFocus,
  nextCardDensity,
  toggleFavoriteList,
  focusKeepIds,
  formatWorkspaceCompetencia,
} from "@/lib/workspace/workspace-engine";

export {
  WORKSPACE_FOCUS_HIDDEN,
  WORKSPACE_FOCUS_KEEP,
} from "@/lib/workspace/workspace-types";

export type {
  WorkspaceBlockId,
  WorkspaceCardDensity,
  WorkspaceCommand,
  WorkspaceCommandKind,
  WorkspaceQuickAction,
  WorkspaceQuickActionId,
  WorkspaceState,
} from "@/lib/workspace/workspace-types";
