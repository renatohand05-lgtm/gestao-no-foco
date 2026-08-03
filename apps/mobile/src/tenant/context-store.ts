import type { SegmentId } from "@gof/config";
import type { TenantContext } from "@gof/domain";
import { create } from "zustand";

import { setLastBranchId, setLastTenantId } from "@/auth/secure-session";
import { queryClient } from "@/query/client";

type TenantStore = TenantContext & {
  continuedWithoutBranch: boolean;
  setTenant: (input: {
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
    segmentId: SegmentId | null;
    permissions?: readonly string[];
  }) => void;
  setBranch: (branchId: string, branchName: string) => void;
  continueWithoutBranch: () => void;
  restoreFromMetadata: (input: { tenantId: string; branchId: string | null }) => void;
  clearTenant: () => void;
};

const empty: TenantContext & { continuedWithoutBranch: boolean } = {
  tenantId: "",
  tenantSlug: "",
  tenantName: "",
  branchId: null,
  branchName: null,
  segmentId: null,
  permissions: [],
  continuedWithoutBranch: false,
};

export const useTenantStore = create<TenantStore>((set) => ({
  ...empty,

  setTenant: (input) => {
    queryClient.clear();
    void setLastTenantId(input.tenantId);
    void setLastBranchId(null);
    set({
      tenantId: input.tenantId,
      tenantSlug: input.tenantSlug,
      tenantName: input.tenantName,
      segmentId: input.segmentId,
      branchId: null,
      branchName: null,
      permissions: input.permissions ?? [],
      continuedWithoutBranch: false,
    });
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
    }));
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
