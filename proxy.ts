import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";
import { REFERRAL_CODE_COOKIE } from "@/lib/platform/referral-cookie";

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);

  // Captura ?ref=código em QUALQUER página e grava num cookie de 30 dias —
  // o onboarding lê esse cookie depois pra atribuir a empresa nova ao
  // parceiro certo. Antes disso, o cookie nunca era definido em lugar
  // nenhum: nenhuma indicação de parceiro (?ref=...) jamais funcionou.
  const ref = request.nextUrl.searchParams.get("ref");
  if (ref) {
    response.cookies.set(REFERRAL_CODE_COOKIE, ref, {
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Exclui assets estáticos públicos (incl. PWA manifest).
     * Sem isto, /manifest.webmanifest caía no middleware e redirecionava para /login.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest|txt|xml|woff2?)$).*)",
  ],
};
