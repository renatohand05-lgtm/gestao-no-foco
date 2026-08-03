import type { TenantRole } from "@/lib/constants";
import {
  authenticateMobileRequest,
  isMobileAuthFailure,
} from "@/lib/mobile/auth-request";
import { isInactiveMembership } from "@/lib/mobile/membership";
import {
  mobileError,
  mobileJson,
  mobileUnauthorized,
} from "@/lib/mobile/response";
import { mapDatabaseErrorToUserMessage } from "@/lib/supabase/friendly-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/mobile/v1/memberships */
export async function GET(request: Request) {
  const auth = await authenticateMobileRequest(request);
  if (isMobileAuthFailure(auth)) {
    return mobileUnauthorized(auth.message);
  }

  const { user, supabase } = auth;

  try {
    const { data: memberships, error: membershipsError } = await supabase
      .from("tenant_members")
      .select("role, tenant_id, status, deactivated_at")
      .eq("user_id", user.id);

    if (membershipsError) {
      return mobileError(mapDatabaseErrorToUserMessage(membershipsError));
    }

    const active = (memberships ?? []).filter((m) => !isInactiveMembership(m));
    if (active.length === 0) {
      return mobileJson({ items: [] });
    }

    const tenantIds = active.map((m) => m.tenant_id);
    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, name, slug, segment")
      .in("id", tenantIds);

    if (tenantsError) {
      return mobileError(mapDatabaseErrorToUserMessage(tenantsError));
    }

    const items = (tenants ?? []).map((tenant) => {
      const membership = active.find((m) => m.tenant_id === tenant.id)!;
      return {
        tenantId: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        role: membership.role as TenantRole,
        segmentId: tenant.segment,
      };
    });

    return mobileJson({ items });
  } catch (err) {
    return mobileError(mapDatabaseErrorToUserMessage(err));
  }
}
