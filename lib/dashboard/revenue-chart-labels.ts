/**
 * Seleção e posicionamento de labels do gráfico de faturamento (Sprint 25.6.3).
 * Sem regras de negócio — só apresentação a partir da série já carregada.
 */

import type { DashboardChartPoint } from "@/types/dashboard-executive";

export type RevenueChartBreakpoint = "desktop" | "notebook" | "mobile";

export type RevenueChartCoord = {
  index: number;
  x: number;
  y: number;
  point: DashboardChartPoint;
};

export type RevenueLabelRole = "peak" | "second" | "last" | "active";

export type RevenueLabelPlacement = {
  index: number;
  role: RevenueLabelRole;
  x: number;
  y: number;
  /** CSS: above | below */
  side: "above" | "below";
  /** Deslocamento lateral em unidades do viewBox (x) */
  dx: number;
  highlight: boolean;
};

export type RevenueTooltipModel = {
  index: number;
  point: DashboardChartPoint;
  previous: DashboardChartPoint | null;
  delta: number | null;
  variationPct: number | null;
  /** Só preenchido quando meta do dia for fornecida — nunca inventada. */
  metaStatus: "acima" | "abaixo" | "igual" | null;
  metaValue: number | null;
};

const VIEW_W = 100;
const VIEW_H = 56;
const LABEL_X_GAP = 10;
const SECOND_MIN_X_GAP = 14;

export function resolveRevenueBreakpoint(width: number): RevenueChartBreakpoint {
  if (width < 768) return "mobile";
  if (width < 1536) return "notebook";
  return "desktop";
}

export function buildRevenueCoords(
  data: DashboardChartPoint[],
): RevenueChartCoord[] {
  if (data.length === 0) return [];

  const values = data.map((p) => p.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = rawMax - rawMin || Math.abs(rawMax) || 1;
  const pad = span * 0.18;
  const min = Math.max(0, rawMin - pad);
  const max = rawMax + pad;
  const range = max - min || 1;
  const padTop = 8;
  const padBottom = 6;

  return data.map((point, index) => {
    const x = data.length === 1 ? VIEW_W / 2 : (index / (data.length - 1)) * VIEW_W;
    const y =
      VIEW_H -
      padBottom -
      ((point.value - min) / range) * (VIEW_H - padTop - padBottom);
    return { index, x, y, point };
  });
}

function findPeakIndex(coords: RevenueChartCoord[]): number {
  let best = 0;
  for (let i = 1; i < coords.length; i++) {
    if (coords[i]!.point.value > coords[best]!.point.value) best = i;
  }
  return best;
}

function findSecondPeakIndex(
  coords: RevenueChartCoord[],
  peakIndex: number,
): number | null {
  let best: number | null = null;
  for (let i = 0; i < coords.length; i++) {
    if (i === peakIndex) continue;
    if (coords[i]!.point.value <= 0) continue;
    if (
      best == null ||
      coords[i]!.point.value > coords[best]!.point.value
    ) {
      best = i;
    }
  }
  if (best == null) return null;
  const peak = coords[peakIndex]!;
  const second = coords[best]!;
  // Só exibe se visualmente distante do maior pico (evita sobreposição)
  if (Math.abs(second.x - peak.x) < SECOND_MIN_X_GAP) return null;
  return best;
}

function findLastPositiveIndex(coords: RevenueChartCoord[]): number {
  for (let i = coords.length - 1; i >= 0; i--) {
    if (coords[i]!.point.value > 0) return i;
  }
  return coords.length - 1;
}

function placeLabel(
  coord: RevenueChartCoord,
  role: RevenueLabelRole,
  occupied: Array<{ x: number; y: number; side: "above" | "below" }>,
): RevenueLabelPlacement {
  let side: "above" | "below" = coord.y < 14 ? "below" : "above";
  let dx = 0;

  if (coord.x < 8) dx = 4;
  else if (coord.x > VIEW_W - 8) dx = -4;

  const collides = (s: "above" | "below", d: number) =>
    occupied.some(
      (o) =>
        o.side === s &&
        Math.abs(o.x - (coord.x + d)) < LABEL_X_GAP &&
        Math.abs(o.y - coord.y) < 10,
    );

  if (collides(side, dx)) {
    side = side === "above" ? "below" : "above";
  }
  if (collides(side, dx)) {
    dx = dx === 0 ? 5 : dx * -1;
  }

  const placement: RevenueLabelPlacement = {
    index: coord.index,
    role,
    x: coord.x,
    y: coord.y,
    side,
    dx,
    highlight: role === "peak",
  };
  occupied.push({ x: coord.x + dx, y: coord.y, side });
  return placement;
}

/**
 * Seleciona labels fixos conforme breakpoint — sem rotular todos os dias.
 */
export function selectRevenueLabels(
  coords: RevenueChartCoord[],
  breakpoint: RevenueChartBreakpoint,
  activeIndex: number | null = null,
): RevenueLabelPlacement[] {
  if (coords.length === 0) return [];

  const peakIndex = findPeakIndex(coords);
  const lastIndex = findLastPositiveIndex(coords);
  const secondIndex =
    breakpoint === "desktop" ? findSecondPeakIndex(coords, peakIndex) : null;

  const roles = new Map<number, RevenueLabelRole>();
  roles.set(peakIndex, "peak");

  if (breakpoint === "desktop" && secondIndex != null) {
    roles.set(secondIndex, "second");
  }

  if (lastIndex !== peakIndex && lastIndex !== secondIndex) {
    roles.set(lastIndex, "last");
  }

  if (activeIndex != null && activeIndex >= 0 && activeIndex < coords.length) {
    if (!roles.has(activeIndex)) roles.set(activeIndex, "active");
  }

  const occupied: Array<{ x: number; y: number; side: "above" | "below" }> = [];
  const order: RevenueLabelRole[] = ["peak", "second", "last", "active"];
  const result: RevenueLabelPlacement[] = [];

  for (const role of order) {
    for (const [index, r] of roles) {
      if (r !== role) continue;
      result.push(placeLabel(coords[index]!, role, occupied));
    }
  }

  return result;
}

export function buildRevenueTooltip(
  coords: RevenueChartCoord[],
  index: number,
  metaByDate?: Record<string, number> | null,
): RevenueTooltipModel | null {
  const current = coords[index];
  if (!current) return null;

  const previous = index > 0 ? coords[index - 1]! : null;
  const delta =
    previous != null ? current.point.value - previous.point.value : null;
  const variationPct =
    previous != null && previous.point.value !== 0
      ? (delta! / Math.abs(previous.point.value)) * 100
      : null;

  const metaValue = metaByDate?.[current.point.data] ?? null;
  let metaStatus: RevenueTooltipModel["metaStatus"] = null;
  if (metaValue != null && metaValue > 0) {
    if (current.point.value > metaValue) metaStatus = "acima";
    else if (current.point.value < metaValue) metaStatus = "abaixo";
    else metaStatus = "igual";
  }

  return {
    index,
    point: current.point,
    previous: previous?.point ?? null,
    delta,
    variationPct,
    metaStatus,
    metaValue,
  };
}

export function formatChartDate(isoOrLabel: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(isoOrLabel)) {
    const [y, m, d] = isoOrLabel.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  return isoOrLabel;
}

export const REVENUE_CHART_VIEW = { w: VIEW_W, h: VIEW_H } as const;
