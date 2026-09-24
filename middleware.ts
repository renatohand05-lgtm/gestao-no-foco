import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { REFERRAL_CODE_COOKIE } from "@/lib/platform/referral-cookie";

/**
 * Captura ?ref=código em QUALQUER página (site, /cadastro, /login etc.) e
 * grava num cookie de 30 dias — o onboarding lê esse cookie depois pra
 * atribuir a empresa nova ao parceiro certo.
 *
 * Antes desse middleware, o cookie nunca era definido em lugar nenhum:
 * nenhuma indicação de parceiro (?ref=...) jamais funcionou.
 */
export function middleware(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("ref");
  if (!ref) return NextResponse.next();

  const response = NextResponse.next();
  response.cookies.set(REFERRAL_CODE_COOKIE, ref, {
    maxAge: 60 * 60 * 24 * 30, // 30 dias — sobrevive à confirmação de e-mail
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export const config = {
  matcher: [
    // Roda em toda página, exceto assets estáticos/internos do Next.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
