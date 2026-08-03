import type { AuthSessionState } from "@gof/domain";
import type { Href } from "expo-router";

export function resolveBootRoute(state: AuthSessionState): Href {
  switch (state) {
    case "booting":
    case "authenticating":
    case "refreshing":
      return "/";
    case "unauthenticated":
    case "expired":
    case "revoked":
    case "error":
      return "/(auth)/login";
    case "authenticated_without_tenant":
      return "/(auth)/tenant";
    case "authenticated_without_branch":
      return "/(auth)/branch";
    case "offline_limited":
      return "/offline";
    case "authenticated":
      return "/(app)";
    default:
      return "/(auth)/login";
  }
}

export function requiresAuth(pathname: string): boolean {
  return (
    pathname.startsWith("/(app)") ||
    pathname === "/offline" ||
    pathname === "/access-denied"
  );
}

export function isAuthFlow(pathname: string): boolean {
  return pathname.startsWith("/(auth)");
}

export function shouldOfferBiometricSetup(state: AuthSessionState): boolean {
  return state === "authenticated_without_tenant";
}
