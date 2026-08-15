import type { SegmentId } from "@gof/config";
import type { TenantContext } from "@gof/domain";
import { create } from "zustand";

import { setLastBranchId, setLastTenantId } from "@/auth/secure-session";
import { queryClient } from "@/query/client";
import { savePermissionsCache } from "@/tenant/permissions-cache";

export type PermissionsStatus = "idle" | "loading" | "ready" | "error";

type TenantStore = TenantContext & {
  continuedWithoutBranch: boolean;
  /** idle = sem tenant; loading = hidratando; ready = RBAC aplicável; error = falha sem cache. */
  permissionsStatus: PermissionsStatus;
  setTenant: (input: {
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
    segmentId: SegmentId | null;
    modules?: TenantContext["modules"];
    permissions?: readonly string[];
  }) => void;
  setBranch: (branchId: string, branchName: string) => void;
  continueWithoutBranch: () => void;
  restoreFromMetadata: (input: { tenantId: string; branchId: string | null }) => void;
  beginPermissionsHydration: () => void;
  applyPermissions: (
    permissions: readonly string[],
    meta?: { source?: "cache" | "network" | "select" },
  ) => void;
  markPermissionsReady: () => void;
  markPermissionsError: (reason?: string) => void;
  clearTenant: () => void;
};

const empty: TenantContext & {
  continuedWithoutBranch: boolean;
  permissionsStatus: PermissionsStatus;
} = {
  tenantId: "",
  tenantSlug: "",
  tenantName: "",
  branchId: null,
  branchName: null,
  segmentId: null,
  permissions: [],
  continuedWithoutBranch: false,
  permissionsStatus: "idle",
};

export const useTenantStore = create<TenantStore>((set, get) => ({
  ...empty,

  setTenant: (input) => {
    queryClient.clear();
    void setLastTenantId(input.tenantId);
    void setLastBranchId(null);
    const permissions = input.permissions ?? [];
    set({
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
      tenantName: input.tenantName,
      segmentId: input.segmentId,
      modules: input.modules ?? null,
      branchId: null,
      branchName: null,
      permissions,
      permissionsStatus: "ready",
      continuedWithoutBranch: false,
    });
    if (permissions.length > 0) {
      void savePermissionsCache(input.tenantId, permissions);
    }
  },

  setBranch: (branchId, branchName) => {
    void setLastBranchId(branchId);
    set({ branchId, branchName, continuedWithoutBranch: false });
  },

  continueWithoutBranch: () => {
    void setLastBranchId(null);
    set({ branchId: null, branchName: null, continuedWithoutBranch: true });
  },

  restoreFromMetadata: ({ tenantId, branchId }) => {
    set((state) => ({
      ...state,
      tenantId: tenantId || state.tenantId,
      branchId: branchId ?? null,
      continuedWithoutBranch: !branchId,
      // RBAC ainda não hidratado — evita tratar [] como deny definitivo.
      permissionsStatus:
        state.permissionsStatus === "ready" ? state.permissionsStatus : "loading",
    }));
  },

  beginPermissionsHydration: () => {
    set({ permissionsStatus: "loading" });
  },

  applyPermissions: (permissions) => {
    set({
      permissions: [...permissions],
    });
  },

  markPermissionsReady: () => {
    set({ permissionsStatus: "ready" });
  },

  markPermissionsError: () => {
    const { permissions } = get();
    // Só marca error se não há permissões úteis em memória.
    set({
      permissionsStatus: permissions.length > 0 ? "ready" : "error",
    });
  },

  clearTenant: () => {
    queryClient.clear();
    void setLastTenantId(null);
    void setLastBranchId(null);
    set({ ...empty });
  },
}));

export function hasTenantContext(): boolean {
  const s = useTenantStore.getState();
  return Boolean(s.tenantId && (s.branchId || s.continuedWithoutBranch));
}

export function hasFullTenantContext(): boolean {
  const s = useTenantStore.getState();
  return Boolean(s.tenantId);
}

/** Tabs/guards: RBAC só é autoritativo após ready (ou error com lista vazia). */
export function arePermissionsAuthoritative(
  status: PermissionsStatus,
): boolean {
  return status === "ready" || status === "error";
}
