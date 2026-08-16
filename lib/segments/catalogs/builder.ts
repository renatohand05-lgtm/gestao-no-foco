import type { ProductSegmentId } from "../types.ts";
import type { ProdutoTipo } from "../../../types/produtos.ts";
import type {
  LibraryGroup,
  LibrarySeed,
  SegmentLibraryItem,
} from "./types.ts";

export function normalizeCatalogName(name: string): string {
  const stripped = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  const stop = new Set([
    "de",
    "da",
    "do",
    "das",
    "dos",
    "e",
    "a",
    "o",
    "as",
    "os",
    "para",
    "com",
    "em",
  ]);
  return stripped
    .split(" ")
    .filter((token) => token.length > 0 && !stop.has(token))
    .join(" ");
}

export function namesAreEquivalent(a: string, b: string): boolean {
  return normalizeCatalogName(a) === normalizeCatalogName(b);
}

function slugPart(value: string): string {
  const slug = normalizeCatalogName(value).replace(/\s+/g, "-");
  return slug.slice(0, 56) || "item";
}

function seedName(seed: LibrarySeed): string {
  return typeof seed === "string" ? seed : seed.name;
}

function expandSeed(
  segment: ProductSegmentId,
  group: LibraryGroup,
  seed: LibrarySeed,
  index: number,
  usedIds: Set<string>,
): SegmentLibraryItem {
  const name = seedName(seed);
  const extra = typeof seed === "string" ? ({} as Exclude<LibrarySeed, string>) : seed;
  const recommendCount = group.recommendCount ?? 2;
  const recommended =
    extra.recommended ??
    group.recommended ??
    index < recommendCount;
  const baseId = `${segment}-${slugPart(group.category)}-${slugPart(name)}`;
  let id = baseId;
  let n = 2;
  while (usedIds.has(id)) {
    id = `${baseId}-${n}`;
    n += 1;
  }
  usedIds.add(id);
  const itemType: ProdutoTipo = extra.itemType ?? group.defaultItemType ?? "servico";
  return {
    id,
    segment,
    category: group.category,
    name,
    description:
      extra.description ??
      `${name} — sugestão inicial para ${group.category.toLowerCase()}.`,
    defaultDurationMinutes:
      extra.defaultDurationMinutes ?? group.defaultDurationMinutes,
    suggestedUnit: extra.suggestedUnit ?? group.defaultUnit,
    itemType,
    tags: extra.tags ?? [group.category.toLowerCase()],
    requiredCapabilities:
      group.requiredCapabilities ?? ["catalog"],
    recommended,
    active: extra.active ?? true,
  };
}

export function defineLibrary(
  segment: ProductSegmentId,
  groups: LibraryGroup[],
): SegmentLibraryItem[] {
  const usedIds = new Set<string>();
  const items: SegmentLibraryItem[] = [];
  for (const group of groups) {
    group.items.forEach((seed, index) => {
      items.push(expandSeed(segment, group, seed, index, usedIds));
    });
  }
  return items;
}

export function groupLibraryByCategory(
  items: SegmentLibraryItem[],
): Map<string, SegmentLibraryItem[]> {
  const map = new Map<string, SegmentLibraryItem[]>();
  for (const item of items) {
    const list = map.get(item.category) ?? [];
    list.push(item);
    map.set(item.category, list);
  }
  return map;
}
