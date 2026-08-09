import { unlockApp, loadBiometricPref } from "@/auth/biometrics";
import { consumeBiometricUnlockAttempt } from "@/auth/boot-attempts";
import { resolveBootRoute } from "@/auth/guards";
import {
  classifyBiometricUnlockFailure,
  messageForAuthFailure,
} from "@/auth/recovery-policy";
import { useSessionStore } from "@/auth/session-store";
import { RootErrorBoundary } from "@/bootstrap/RootErrorBoundary";
import { queryClient } from "@/query/client";
import { ThemeProvider, useTheme } from "@/design/theme";
import { resolveInternalDeepLink } from "@/productivity/deep-links";
import { logger } from "@/observability/logger";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, router, useRootNavigationState } from "expo-router";
import * as Linking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function safeReplace(href: ReturnType<typeof resolveBootRoute>) {
  try {
    router.replace(href);
  } catch (err) {
    logger.warn("nav.replace_failed", {
      name: err instanceof Error ? err.name : "Error",
    });
  }
}

function handleAuthDeepLink(url: string) {
  try {
    if (url.includes("auth/reset")) {
      router.push("/(auth)/reset");
      return;
    }
    if (url.includes("auth/callback")) {
      router.push("/(auth)/reset");
      return;
    }
    const state = useSessionStore.getState().state;
    if (
      state !== "authenticated" &&
      state !== "authenticated_without_branch" &&
      state !== "offline_limited"
    ) {
      return;
    }
    const resolved = resolveInternalDeepLink(url);
    if (resolved.ok) {
      router.push(resolved.route as never);
    }
  } catch (err) {
    logger.warn("deeplink.handle_failed", {
      name: err instanceof Error ? err.name : "Error",
    });
  }
}

function RootNavigator() {
  const { resolved } = useTheme();
  return (
    <>
      <StatusBar style={resolved === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
        <Stack.Screen name="offline" options={{ presentation: "modal" }} />
        <Stack.Screen name="access-denied" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const boot = useSessionStore((s) => s.boot);
  const state = useSessionStore((s) => s.state);
  const returnToLogin = useSessionStore((s) => s.returnToLogin);
  const biometricGateStarted = useRef(false);
  const navigationState = useRootNavigationState();
  const navigationReady = Boolean(navigationState?.key);

  useEffect(() => {
    logger.info("app.boot_start", {});
    void boot({ mode: "auto" })
      .catch((err) => {
        logger.error("app.boot_unhandled", err);
        useSessionStore.getState().setError(
          messageForAuthFailure("unexpected"),
        );
      })
      .finally(() => {
        SplashScreen.hideAsync().catch(() => undefined);
      });
  }, [boot]);

  useEffect(() => {
    if (state !== "booting") {
      SplashScreen.hideAsync().catch(() => undefined);
      logger.info("app.boot_state", { state });
    }
  }, [state]);

  useEffect(() => {
    if (state === "booting" || biometricGateStarted.current) return;
    // Marca imediatamente para evitar corrida (Strict Mode / re-render).
    biometricGateStarted.current = true;

    void (async () => {
      try {
        const enabled = await loadBiometricPref();
        if (!enabled) return;

        if (state !== "authenticated" && state !== "offline_limited") {
          return;
        }

        // Sessão local já validada pelo boot; Face ID só desbloqueia UI.
        if (!consumeBiometricUnlockAttempt()) return;

        // Aguarda router pronto antes de qualquer navegação.
        if (!navigationReady) {
          logger.info("biometric.wait_nav");
        }

        const result = await unlockApp();
        if (result.ok) {
          logger.info("biometric.unlock_ok");
          return;
        }

        const kind = classifyBiometricUnlockFailure(result.message);
        logger.info("biometric.unlock_fail", { kind });
        await returnToLogin(
          `biometric_${kind}`,
          messageForAuthFailure(kind),
        );
        if (navigationReady) {
          safeReplace(resolveBootRoute("unauthenticated"));
        }
      } catch (err) {
        logger.error("biometric.gate_failed", err);
        try {
          await returnToLogin(
            "biometric_unexpected",
            messageForAuthFailure("biometric_failed"),
          );
          if (navigationReady) {
            safeReplace(resolveBootRoute("unauthenticated"));
          }
        } catch {
          useSessionStore
            .getState()
            .setError(messageForAuthFailure("biometric_failed"));
        }
      }
    })();
  }, [state, returnToLogin, navigationReady]);

  useEffect(() => {
    const sub = Linking.addEventListener("url", ({ url }) => {
      handleAuthDeepLink(url);
    });
    Linking.getInitialURL()
      .then((url) => {
        if (url) handleAuthDeepLink(url);
      })
      .catch(() => undefined);
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RootErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <RootNavigator />
          </ThemeProvider>
        </QueryClientProvider>
      </RootErrorBoundary>
    </GestureHandlerRootView>
  );
}

export { resolveBootRoute };
