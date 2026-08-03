import {
  authenticateMobileRequest,
  isMobileAuthFailure,
} from "@/lib/mobile/auth-request";
import {
  mobileError,
  mobileJson,
  mobileUnauthorized,
} from "@/lib/mobile/response";
import { mapDatabaseErrorToUserMessage } from "@/lib/supabase/friendly-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/mobile/v1/me */
export async function GET(request: Request) {
  const auth = await authenticateMobileRequest(request);
  if (isMobileAuthFailure(auth)) {
    return mobileUnauthorized(auth.message);
  }

  const { user, supabase } = auth;

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const displayName =
      profile?.full_name ??
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      user.email?.split("@")[0] ??
      "Usuário";

    return mobileJson({
      id: user.id,
      email: user.email ?? "",
      displayName,
    });
  } catch (err) {
    return mobileError(mapDatabaseErrorToUserMessage(err));
  }
}
