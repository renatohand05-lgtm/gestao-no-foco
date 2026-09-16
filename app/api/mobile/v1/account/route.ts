import {
  authenticateMobileRequest,
  isMobileAuthFailure,
} from "@/lib/mobile/auth-request";
import { deleteOwnAccount } from "@/lib/platform/account-delete-service";
import {
  mobileError,
  mobileJson,
  mobileUnauthorized,
  readMobileRequestId,
} from "@/lib/mobile/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * DELETE /api/mobile/v1/account
 * Exclusão da própria conta — exigência da Apple (Guideline 5.1.1(v)).
 */
export async function DELETE(request: Request) {
  const requestId = readMobileRequestId(request);
  const auth = await authenticateMobileRequest(request);
  if (isMobileAuthFailure(auth)) {
    return mobileUnauthorized(auth.message, requestId);
  }

  try {
    const result = await deleteOwnAccount(auth.user.id);
    if (!result.ok) {
      return mobileJson(
        {
          code: "ACCOUNT_DELETE_BLOCKED",
          message: result.error,
          tenantsBloqueando: result.tenantsBloqueando,
        },
        409,
        requestId,
      );
    }
    return mobileJson({ ok: true }, 200, requestId);
  } catch (err) {
    return mobileError(
      err instanceof Error ? err.message : "Erro inesperado",
      undefined,
      requestId,
    );
  }
}
