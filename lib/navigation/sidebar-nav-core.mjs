/**
 * Core puro (ESM) — validação/agrupamento do sidebar.
 * Usado por testes Node e reexportado pelo wrapper TypeScript.
 */

export const NAV_GROUP_ORDER = [
  "principal",
  "operacao",
  "inteligencia",
  "sistema",
];

export const NAV_GROUP_LABEL = {
  principal: "Principal",
  operacao: "Operação",
  inteligencia: "Inteligência",
  sistema: "Sistema",
};

export function validateAndDedupeNavItems(items, options = {}) {
  const issues = [];
  const seenIds = new Map();
  const seenHrefs = new Map();
  const labelsByGroup = new Map();
  const out = [];
  const isDev = process.env.NODE_ENV !== "production";

  for (const raw of items) {
    const id = typeof raw.id === "string" ? raw.id.trim() : "";
    const href = typeof raw.href === "string" ? raw.href.trim() : "";
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    const group = raw.group;

    if (!id) {
      issues.push({
        code: "missing_id",
        message: `Item sem id (title="${title}", href="${href}")`,
      });
      continue;
    }
    if (!href) {
      issues.push({
        code: "missing_href",
        message: `Item "${id}" sem href`,
        itemIds: [id],
      });
      continue;
    }
    if (!NAV_GROUP_ORDER.includes(group)) {
      issues.push({
        code: "invalid_group",
        message: `Item "${id}" com group inválido: ${String(group)}`,
        itemIds: [id],
      });
      continue;
    }

    if (seenIds.has(id)) {
      issues.push({
        code: "duplicate_id",
        message: `id duplicado: "${id}"`,
        itemIds: [id],
        hrefs: [seenIds.get(id).href, href],
      });
      continue;
    }

    if (seenHrefs.has(href)) {
      const prev = seenHrefs.get(href);
      issues.push({
        code: "duplicate_href",
        message: `href duplicado: "${href}" (ids: ${prev.id}, ${id})`,
        itemIds: [prev.id, id],
        hrefs: [href],
      });
      continue;
    }

    const labelSet = labelsByGroup.get(group) ?? new Set();
    if (title && labelSet.has(title.toLowerCase())) {
      issues.push({
        code: "duplicate_label_in_group",
        message: `label "${title}" repetido no grupo "${group}"`,
        itemIds: [id],
      });
    } else if (title) {
      labelSet.add(title.toLowerCase());
      labelsByGroup.set(group, labelSet);
    }

    seenIds.set(id, raw);
    seenHrefs.set(href, raw);
    out.push(raw);
  }

  if (issues.length > 0 && isDev) {
    const detail = issues.map((i) => `  - [${i.code}] ${i.message}`).join("\n");
    console.warn(
      `[sidebar-nav] Problemas na navegação (${issues.length}):\n${detail}`,
    );
    if (options.throwInDev) {
      throw new Error(`[sidebar-nav] Configuração inválida:\n${detail}`);
    }
  }

  return { ok: issues.length === 0, issues, items: out };
}

export function buildSidebarNavGroups(items) {
  const { items: safe } = validateAndDedupeNavItems(items);
  return NAV_GROUP_ORDER.map((groupId) => ({
    id: groupId,
    label: NAV_GROUP_LABEL[groupId],
    items: safe.filter((item) => item.group === groupId),
  })).filter((g) => g.items.length > 0);
}

export function sidebarItemKey(groupId, item) {
  return `${groupId}:${item.id}`;
}

export function isNavItemActive(pathname, item, siblings) {
  if (!pathname) return false;
  if (pathname === item.href) return true;
  if (!pathname.startsWith(`${item.href}/`)) return false;
  const coveredByLongerSibling = siblings.some(
    (s) =>
      s.href !== item.href &&
      s.href.startsWith(`${item.href}/`) &&
      (pathname === s.href || pathname.startsWith(`${s.href}/`)),
  );
  return !coveredByLongerSibling;
}
