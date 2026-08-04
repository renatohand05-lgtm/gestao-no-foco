import AsyncStorage from "@react-native-async-storage/async-storage";

import type { MobileOpsWorkOrderDetail } from "@/api/mobile-api";

const DETAIL_PREFIX = "@gof/cache/ops-workorder/";
const PENDING_PREFIX = "@gof/cache/ops-upload-pending/";

/** Snapshot RO do detalhe da OS (sem blobs). */
export async function saveWorkOrderSnapshot(
  tenantId: string,
  osId: string,
  data: MobileOpsWorkOrderDetail,
): Promise<void> {
  if (!tenantId || !osId) return;
  const compact: MobileOpsWorkOrderDetail = {
    ...data,
    photos: data.photos.map((p) => ({ ...p, thumbUrl: null })),
    signatures: data.signatures.map((s) => ({ ...s, thumbUrl: null })),
  };
  await AsyncStorage.setItem(
    `${DETAIL_PREFIX}${tenantId}/${osId}`,
    JSON.stringify({ savedAt: Date.now(), data: compact }),
  );
}

export async function loadWorkOrderSnapshot(
  tenantId: string,
  osId: string,
): Promise<{ savedAt: number; data: MobileOpsWorkOrderDetail } | null> {
  if (!tenantId || !osId) return null;
  try {
    const raw = await AsyncStorage.getItem(`${DETAIL_PREFIX}${tenantId}/${osId}`);
    if (!raw) return null;
    return JSON.parse(raw) as {
      savedAt: number;
      data: MobileOpsWorkOrderDetail;
    };
  } catch {
    return null;
  }
}

export type PendingUpload = {
  id: string;
  osId: string;
  kind: "photo" | "signature" | "attachment";
  etapa: string;
  fileName: string;
  mimeType: string;
  createdAt: number;
};

/** Fila de uploads pendentes (metadados) — blobs não ficam em storage inseguro. */
export async function enqueuePendingUpload(
  tenantId: string,
  item: PendingUpload,
): Promise<void> {
  if (!tenantId) return;
  const key = PENDING_PREFIX + tenantId;
  const raw = await AsyncStorage.getItem(key);
  const list: PendingUpload[] = raw ? (JSON.parse(raw) as PendingUpload[]) : [];
  list.push(item);
  await AsyncStorage.setItem(key, JSON.stringify(list.slice(-40)));
}

export async function listPendingUploads(
  tenantId: string,
): Promise<PendingUpload[]> {
  if (!tenantId) return [];
  try {
    const raw = await AsyncStorage.getItem(PENDING_PREFIX + tenantId);
    return raw ? (JSON.parse(raw) as PendingUpload[]) : [];
  } catch {
    return [];
  }
}

export function minutesSince(savedAt: number): number {
  return Math.max(0, Math.round((Date.now() - savedAt) / 60_000));
}
