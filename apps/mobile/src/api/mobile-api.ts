import { apiRequest } from "@/api/client";
import { getAccessToken } from "@/auth/secure-session";

export type MeResponse = {
  id: string;
  email: string;
  displayName: string;
};

export type MembershipItem = {
  tenantId: string;
  slug: string;
  name: string;
  role: string;
  segmentId: string | null;
};

export type MembershipsResponse = {
  items: MembershipItem[];
};

export type BranchesResponse = {
  items: { id: string; name: string }[];
  allowContinueWithoutBranch: boolean;
  message?: string;
};

export type PermissionsResponse = {
  permissions: string[];
  role: string;
};

async function withToken<T>(path: string): Promise<Awaited<ReturnType<typeof apiRequest<T>>>> {
  const accessToken = await getAccessToken();
  return apiRequest<T>(path, {
    context: { accessToken },
    retry: true,
  });
}

export async function fetchMe() {
  return withToken<MeResponse>("api/mobile/v1/me");
}

export async function fetchMemberships() {
  return withToken<MembershipsResponse>("api/mobile/v1/memberships");
}

export async function fetchBranches(tenantId: string) {
  return withToken<BranchesResponse>(`api/mobile/v1/tenants/${tenantId}/branches`);
}

export async function fetchPermissions(tenantId: string) {
  return withToken<PermissionsResponse>(`api/mobile/v1/tenants/${tenantId}/permissions`);
}

export async function postLogout() {
  const accessToken = await getAccessToken();
  return apiRequest<{ ok: boolean; message: string }>("api/mobile/v1/auth/logout", {
    method: "POST",
    context: { accessToken },
  });
}
