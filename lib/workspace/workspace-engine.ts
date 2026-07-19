/**
 * Workspace engine — catálogos e helpers de UX (Sprint 12.1).
 * Sem fetch · sem persistência de negócio.
 */

import type {
  WorkspaceBlockId,
  WorkspaceCardDensity,
  WorkspaceCommand,
  WorkspaceQuickAction,
} from "@/lib/workspace/workspace-types";
import {
  WORKSPACE_FOCUS_HIDDEN,
  WORKSPACE_FOCUS_KEEP,
} from "@/lib/workspace/workspace-types";

/** Command bar — arquitetura (sem backend). */
export function listWorkspaceCommands(): WorkspaceCommand[] {
  return [
    {
      id: "cmd-indicador",
      kind: "indicador",
      label: "Pesquisar indicador",
      hint: "Atingimento, ritmo, projeção, ticket…",
      shortcut: "I",
    },
    {
      id: "cmd-centro",
      kind: "centro",
      label: "Pesquisar centro de custo",
      hint: "Filtrar por centro (arquitetura)",
      shortcut: "C",
    },
    {
      id: "cmd-cliente",
      kind: "cliente",
      label: "Pesquisar cliente",
      hint: "Abrir busca de clientes (arquitetura)",
    },
    {
      id: "cmd-venda",
      kind: "venda",
      label: "Pesquisar venda",
      hint: "Abrir busca de vendas (arquitetura)",
    },
    {
      id: "cmd-produto",
      kind: "produto",
      label: "Pesquisar produto",
      hint: "Abrir busca de produtos (arquitetura)",
    },
    {
      id: "cmd-acao",
      kind: "acao",
      label: "Pesquisar ação",
      hint: "Action Center / Plano executivo",
    },
    {
      id: "cmd-insight",
      kind: "insight",
      label: "Pesquisar insight",
      hint: "Insights e Copilot",
    },
    {
      id: "cmd-ranking",
      kind: "ranking",
      label: "Pesquisar ranking",
      hint: "Clientes, centros, canais",
    },
  ];
}

export function listWorkspaceQuickActions(): WorkspaceQuickAction[] {
  return [
    { id: "nova_venda", label: "Nova Venda" },
    { id: "nova_conta", label: "Nova Conta" },
    { id: "nova_meta", label: "Nova Meta" },
    { id: "novo_cliente", label: "Novo Cliente" },
    { id: "novo_produto", label: "Novo Produto" },
    { id: "nova_categoria", label: "Nova Categoria" },
    { id: "exportar", label: "Exportar" },
    { id: "compartilhar", label: "Compartilhar" },
    { id: "imprimir", label: "Imprimir" },
  ];
}

export function listFabActions(): WorkspaceQuickAction[] {
  return [
    { id: "nova_venda", label: "Nova venda" },
    { id: "nova_conta", label: "Nova conta" },
    { id: "nova_meta", label: "Nova meta" },
    { id: "exportar", label: "Exportar" },
    { id: "imprimir", label: "Imprimir" },
    { id: "compartilhar", label: "Compartilhar" },
  ];
}

export function isBlockHiddenInFocus(
  blockId: WorkspaceBlockId,
  focusMode: boolean,
): boolean {
  if (!focusMode) return false;
  return WORKSPACE_FOCUS_HIDDEN.includes(blockId);
}

export function nextCardDensity(
  current: WorkspaceCardDensity = "normal",
): WorkspaceCardDensity {
  const order: WorkspaceCardDensity[] = [
    "normal",
    "compact",
    "expandido",
    "recolhido",
  ];
  const i = order.indexOf(current);
  return order[(i + 1) % order.length]!;
}

export function toggleFavoriteList(
  favorites: WorkspaceBlockId[],
  blockId: WorkspaceBlockId,
): WorkspaceBlockId[] {
  return favorites.includes(blockId)
    ? favorites.filter((id) => id !== blockId)
    : [...favorites, blockId];
}

export function focusKeepIds(): WorkspaceBlockId[] {
  return [...WORKSPACE_FOCUS_KEEP];
}

export function formatWorkspaceCompetencia(dataDe: string, dataAte: string): string {
  try {
    const de = new Date(`${dataDe}T12:00:00`);
    const ate = new Date(`${dataAte}T12:00:00`);
    const fmt = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return `${fmt.format(de)} – ${fmt.format(ate)}`;
  } catch {
    return `${dataDe} – ${dataAte}`;
  }
}
