import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
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
