/**
 * Agrupamento e validação defensiva da navegação do sidebar (Sprint 25.7.2).
 * Implementação pura em sidebar-nav-core.mjs — este arquivo tipa e reexporta.
 */

import type { NavGroupId, NavItem } from "@/config/navigation";
import { NAV_GROUP_LABEL as CONFIG_GROUP_LABEL } from "@/config/navigation";
import {
  buildSidebarNavGroups as buildCore,
  isNavItemActive as isActiveCore,
  sidebarItemKey as keyCore,
  validateAndDedupeNavItems as validateCore,
  NAV_GROUP_ORDER as CORE_ORDER,
} from "./sidebar-nav-core.mjs";

export type SidebarNavGroup = {
  id: NavGroupId;
  label: string;
  items: NavItem[];
};

export type NavValidationIssue = {
  code:
    | "missing_id"
    | "missing_href"
    | "duplicate_id"
    | "duplicate_href"
    | "duplicate_label_in_group"
    | "invalid_group";
  message: string;
  itemIds?: string[];
  hrefs?: string[];
};

export type NavValidationResult = {
  ok: boolean;
  issues: NavValidationIssue[];
  items: NavItem[];
};

export function validateAndDedupeNavItems(
  items: NavItem[],
  options?: { throwInDev?: boolean },
): NavValidationResult {
  return validateCore(items, options) as NavValidationResult;
}

export function buildSidebarNavGroups(items: NavItem[]): SidebarNavGroup[] {
  const groups = buildCore(items) as SidebarNavGroup[];
  // Garante labels alinhados ao config tipado
  return groups.map((g) => ({
    ...g,
    label: CONFIG_GROUP_LABEL[g.id] ?? g.label,
  }));
}

export function sidebarItemKey(
  groupId: string,
  item: Pick<NavItem, "id">,
): string {
  return keyCore(groupId, item);
}

export function isNavItemActive(
  pathname: string | null | undefined,
  item: Pick<NavItem, "href">,
  siblings: Pick<NavItem, "href">[],
): boolean {
  return isActiveCore(pathname, item, siblings);
}

export { CORE_ORDER as NAV_GROUP_ORDER_RUNTIME };
