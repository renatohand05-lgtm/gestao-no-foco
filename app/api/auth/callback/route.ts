import { NextResponse } from "next/server";

import { getPostLoginPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

/** Destinos internos seguros pós-callback (não aceita URL absoluta). */
function safeInternalPath(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  if (next.includes("://") || next.includes("\\")) return null;
  return next;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeInternalPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Recovery: sessão já estabelecida pelo exchange — ir direto à tela de nova senha.
      if (next === "/nova-senha" || next?.startsWith("/nova-senha?")) {
        return NextResponse.redirect(`${origin}/nova-senha`);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const destination = user
        ? await getPostLoginPath(supabase, user.id, next)
        : (next ?? "/onboarding");

      return NextResponse.redirect(`${origin}${destination}`);
    }
  }

  if (next === "/nova-senha" || next?.startsWith("/nova-senha?")) {
    return NextResponse.redirect(`${origin}/recuperar?error=invalid_or_expired`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
