import { mobileJson } from "@/lib/mobile/response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/mobile/v1/auth/logout
 * Best-effort idempotente — o client limpa a sessão local via Supabase signOut.
 */
export async function POST() {
  return mobileJson({
    ok: true,
    message: "Logout registrado. Limpe a sessão local no cliente.",
  });
}
