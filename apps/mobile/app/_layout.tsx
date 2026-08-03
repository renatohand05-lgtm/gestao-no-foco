import { unlockApp, loadBiometricPref } from "@/auth/biometrics";
import { resolveBootRoute } from "@/auth/guards";
import { useSessionStore } from "@/auth/session-store";
import { queryClient } from "@/query/client";
import { ThemeProvider, useTheme } from "@/design/theme";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as Linking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function handleAuthDeepLink(url: string) {
  if (url.includes("auth/reset")) {
    router.push("/(auth)/reset");
    return;
  }
  if (url.includes("auth/callback")) {
    router.push("/(auth)/reset");
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
  const biometricChecked = useRef(false);

  useEffect(() => {
    boot().finally(() => {
      SplashScreen.hideAsync().catch(() => undefined);
    });
  }, [boot]);

  useEffect(() => {
    if (state !== "booting") {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [state]);

  useEffect(() => {
    if (state === "booting" || biometricChecked.current) return;

    void (async () => {
      const enabled = await loadBiometricPref();
      if (!enabled) {
        biometricChecked.current = true;
        return;
      }
      if (state === "authenticated" || state === "offline_limited") {
        const result = await unlockApp();
        biometricChecked.current = true;
        if (!result.ok) {
          router.replace(resolveBootRoute("unauthenticated"));
        }
      } else {
        biometricChecked.current = true;
      }
    })();
  }, [state]);

  useEffect(() => {
    const sub = Linking.addEventListener("url", ({ url }) => {
      handleAuthDeepLink(url);
    });
    Linking.getInitialURL().then((url) => {
      if (url) handleAuthDeepLink(url);
    });
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RootNavigator />
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

export { resolveBootRoute };
