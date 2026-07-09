import type {
  PlanoContaSelectOption,
  PlanoContaTreeItem,
  PlanoContaTreeNode,
} from "@/types/financeiro";

export function buildPlanoContaTree(
  items: PlanoContaTreeItem[],
): PlanoContaTreeNode[] {
  const byParent = new Map<string | null, PlanoContaTreeItem[]>();

  for (const item of items) {
    const parentKey = item.conta_pai_id ?? null;
    const siblings = byParent.get(parentKey) ?? [];
    siblings.push(item);
    byParent.set(parentKey, siblings);
  }

  function sortSiblings(entries: PlanoContaTreeItem[]) {
    return [...entries].sort((a, b) => {
      if (a.ordem !== b.ordem) return a.ordem - b.ordem;
      return a.codigo.localeCompare(b.codigo, "pt-BR");
    });
  }

  function walk(
    parentId: string | null,
    depth: number,
  ): PlanoContaTreeNode[] {
    const siblings = sortSiblings(byParent.get(parentId) ?? []);

    return siblings.map((item) => ({
      ...item,
      depth,
      children: walk(item.id, depth + 1),
    }));
  }

  return walk(null, 0);
}

export function flattenPlanoContaTree(
  nodes: PlanoContaTreeNode[],
): PlanoContaTreeNode[] {
  const result: PlanoContaTreeNode[] = [];

  function walk(node: PlanoContaTreeNode) {
    result.push(node);
    node.children.forEach(walk);
  }

  nodes.forEach(walk);
  return result;
}

export function buildPlanoContaSelectOptions(
  items: PlanoContaTreeItem[],
  options?: { excludeIds?: string[]; onlySintetica?: boolean },
): PlanoContaSelectOption[] {
  const exclude = new Set(options?.excludeIds ?? []);
  const tree = buildPlanoContaTree(items);

  return flattenPlanoContaTree(tree)
    .filter((item) => !exclude.has(item.id))
    .filter((item) => (options?.onlySintetica ? item.natureza === "sintetica" : true))
    .map((item) => ({
      id: item.id,
      codigo: item.codigo,
      nome: item.nome,
      depth: item.depth,
      label: `${item.codigo} — ${item.nome}`,
    }));
}

export function collectPlanoContaDescendantIds(
  items: PlanoContaTreeItem[],
  rootId: string,
): string[] {
  const byParent = new Map<string, string[]>();

  for (const item of items) {
    if (!item.conta_pai_id) continue;
    const children = byParent.get(item.conta_pai_id) ?? [];
    children.push(item.id);
    byParent.set(item.conta_pai_id, children);
  }

  const descendants: string[] = [];

  function walk(id: string) {
    const children = byParent.get(id) ?? [];
    for (const childId of children) {
      descendants.push(childId);
      walk(childId);
    }
  }

  walk(rootId);
  return descendants;
}
