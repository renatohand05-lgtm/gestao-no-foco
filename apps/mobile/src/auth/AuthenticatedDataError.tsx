import { Button, ErrorState, SafeAreaScreen } from "@/design/components";
import {
  messageForPostLoginCode,
  type PostLoginErrorCode,
} from "@/auth/post-login-errors";
import { useSessionStore } from "@/auth/session-store";
import { resolveBootRoute } from "@/auth/guards";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

type Props = {
  code: PostLoginErrorCode;
  title?: string;
  onRetry?: () => void | Promise<void>;
  /** Se false, esconde "Ir para o início". Default true quando autenticado. */
  showGoHome?: boolean;
};

/**
 * Sessão permanece válida. Não desloga automaticamente.
 */
export function AuthenticatedDataError({
  code,
  title = "Não foi possível carregar seus dados.",
  onRetry,
  showGoHome = true,
}: Props) {
  const logout = useSessionStore((s) => s.logout);
  const state = useSessionStore((s) => s.state);
  const [busy, setBusy] = useState(false);
  const authenticated =
    state === "authenticated" ||
    state === "authenticated_without_tenant" ||
    state === "authenticated_without_branch" ||
    state === "offline_limited";

  return (
    <SafeAreaScreen>
      <ErrorState
        title={title}
        message={`${messageForPostLoginCode(code)} (${code})`}
        action={
          <View style={styles.actions}>
            {onRetry ? (
              <Button
                title="Tentar novamente"
                loading={busy}
                onPress={() => {
                  if (busy) return;
                  setBusy(true);
                  void Promise.resolve(onRetry())
                    .catch(() => undefined)
                    .finally(() => setBusy(false));
                }}
              />
            ) : null}
            {showGoHome && authenticated ? (
              <Button
                title="Ir para o início"
                variant="secondary"
                onPress={() => {
                  try {
                    if (state === "authenticated") {
                      router.replace("/(app)");
                    } else if (state === "authenticated_without_branch") {
                      router.replace("/(auth)/branch");
                    } else {
                      router.replace("/(auth)/tenant");
                    }
                  } catch {
                    /* ignore */
                  }
                }}
              />
            ) : null}
            <Button
              title="Sair da conta"
              variant="ghost"
              loading={busy}
              onPress={() => {
                if (busy) return;
                setBusy(true);
                void logout()
                  .catch(() => undefined)
                  .finally(() => {
                    setBusy(false);
                    try {
                      router.replace(resolveBootRoute("unauthenticated"));
                    } catch {
                      /* ignore */
                    }
                  });
              }}
            />
          </View>
        }
      />
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 12, width: "100%", marginTop: 8 },
});
