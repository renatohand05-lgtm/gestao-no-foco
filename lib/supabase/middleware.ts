import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPostLoginPath, getUserTenantSlugs } from "@/lib/auth/redirect";
import { isProtectedRoute, isTenantRoute, getTenantSlugFromPath } from "@/lib/auth/routes";
import { AUTH_ROUTES, PUBLIC_ROUTES } from "@/lib/constants";
import type { Database } from "@/types/database";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return { url, key };
}

export async function updateSession(request: NextRequest) {
  const env = getSupabaseEnv();

  if (!env) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname === route);
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));

  if (!user && isProtectedRoute(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (!user && !isPublicRoute && !pathname.startsWith("/api")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (user) {
    const redirectTo = request.nextUrl.searchParams.get("redirectTo");
    const defaultDestination = await getPostLoginPath(supabase, user.id);
    const destination = await getPostLoginPath(supabase, user.id, redirectTo);

    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = destination;
      url.searchParams.delete("redirectTo");
      return NextResponse.redirect(url);
    }

    if (pathname === "/onboarding" && defaultDestination !== "/onboarding") {
      const url = request.nextUrl.clone();
      url.pathname = defaultDestination;
      return NextResponse.redirect(url);
    }

    if (isTenantRoute(pathname)) {
      const slug = getTenantSlugFromPath(pathname);

      if (slug) {
        const tenantSlugs = await getUserTenantSlugs(supabase, user.id);

        if (!tenantSlugs.includes(slug)) {
          const url = request.nextUrl.clone();
          url.pathname = defaultDestination;
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return supabaseResponse;
}
