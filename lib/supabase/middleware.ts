import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPostLoginPath, getUserTenantSlugs } from "@/lib/auth/redirect";
import {
  isProtectedRoute,
  isTenantRoute,
  getTenantSlugFromPath,
} from "@/lib/auth/routes";
import { AUTH_ROUTES, OPERATIONAL_API_ROUTES, PUBLIC_ROUTES } from "@/lib/constants";
import { logger } from "@/lib/observability/logger";
import {
  isMaintenanceBypassPath,
  isMaintenanceMode,
} from "@/lib/platform/maintenance";
import { LAST_TENANT_COOKIE } from "@/lib/tenant/active-tenant";
import type { Database } from "@/types/database";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  return { url, key };
}

/** Assets estáticos que nunca devem passar por auth redirect. */
function isStaticPublicAsset(pathname: string) {
  return (
    pathname === "/manifest.webmanifest" ||
    pathname === "/robots.txt" ||
    pathname === "/favicon.ico" ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest|txt|xml|woff2?)$/i.test(pathname)
  );
}

function requestIdFrom(request: NextRequest): string {
  return (
    request.headers.get("x-request-id") ||
    request.headers.get("x-correlation-id") ||
    crypto.randomUUID()
  );
}

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = requestIdFrom(request);

  if (isStaticPublicAsset(pathname)) {
    return NextResponse.next({ request });
  }

  if (isMaintenanceMode() && !isMaintenanceBypassPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/manutencao";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const isOperationalApi = OPERATIONAL_API_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  if (isOperationalApi) {
    const response = NextResponse.next({ request });
    response.headers.set("x-request-id", requestId);
    return response;
  }

  const env = getSupabaseEnv();

  if (!env) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });
  supabaseResponse.headers.set("x-request-id", requestId);

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
        supabaseResponse.headers.set("x-request-id", requestId);
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const preferredSlug =
    request.cookies.get(LAST_TENANT_COOKIE)?.value ?? null;

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
    const defaultDestination = await getPostLoginPath(
      supabase,
      user.id,
      null,
      preferredSlug,
    );
    const destination = await getPostLoginPath(
      supabase,
      user.id,
      redirectTo,
      preferredSlug,
    );

    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = destination;
      url.searchParams.delete("redirectTo");
      return NextResponse.redirect(url);
    }

    // Primeira empresa: /onboarding. Empresa adicional: /empresas/nova (não redirecionar).
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
          logger.warn("tenant_access_denied", {
            requestId,
            attemptedSlug: slug,
            userId: user.id,
            authorizedCount: tenantSlugs.length,
          });
          const url = request.nextUrl.clone();
          url.pathname = defaultDestination;
          return NextResponse.redirect(url);
        }

        // Persistir empresa ativa somente se membership válida.
        if (preferredSlug !== slug) {
          supabaseResponse.cookies.set(LAST_TENANT_COOKIE, slug, {
            path: "/",
            maxAge: 60 * 60 * 24 * 180,
            sameSite: "lax",
          });
        }
      }
    }
  }

  return supabaseResponse;
}
