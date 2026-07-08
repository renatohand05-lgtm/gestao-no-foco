const RESERVED_SEGMENTS = new Set([
  "login",
  "register",
  "onboarding",
  "api",
  "_next",
]);

export function getPathSegments(pathname: string) {
  return pathname.split("/").filter(Boolean);
}

export function isTenantRoute(pathname: string) {
  const [first] = getPathSegments(pathname);
  return Boolean(first && !RESERVED_SEGMENTS.has(first));
}

export function getTenantSlugFromPath(pathname: string) {
  if (!isTenantRoute(pathname)) return null;
  return getPathSegments(pathname)[0] ?? null;
}

export function isProtectedRoute(pathname: string) {
  return pathname === "/onboarding" || isTenantRoute(pathname);
}
