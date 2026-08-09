/**
 * Tela de bootstrap com falha de rede (state=error + tokens preservados).
 * Oferece retry e saída segura para login.
 */
import { resolveBootRoute } from "@/auth/guards";
import {
  messageForAuthFailure,
  titleForAuthFailure,
} from "@/auth/recovery-policy";
import { useSessionStore } from "@/auth/session-store";
import { Button, ErrorState, SafeAreaScreen } from "@/design/components";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

export default function BootstrapErrorActions({
  kind = "network",
}: {
  kind?: "network" | "unexpected";
}) {
  const boot = useSessionStore((s) => s.boot);
  const returnToLogin = useSessionStore((s) => s.returnToLogin);
  const errorMessage = useSessionStore((s) => s.errorMessage);
  const [busy, setBusy] = useState(false);

  return (
    <SafeAreaScreen>
      <ErrorState
        title={titleForAuthFailure(kind)}
        message={errorMessage ?? messageForAuthFailure(kind)}
        action={
          <View style={styles.actions}>
            <Button
              title="Tentar novamente"
              loading={busy}
              onPress={async () => {
                if (busy) return;
                setBusy(true);
                try {
                  await boot({ mode: "manual" });
                  router.replace("/");
                } finally {
                  setBusy(false);
                }
              }}
            />
            <Button
              title="Voltar para o login"
              variant="secondary"
              loading={busy}
              onPress={async () => {
                if (busy) return;
                setBusy(true);
                try {
                  await returnToLogin(
                    "bootstrap_error_return_to_login",
                    messageForAuthFailure(kind),
                  );
                  router.replace(resolveBootRoute("unauthenticated"));
                } finally {
                  setBusy(false);
                }
              }}
            />
          </View>
        }
      />
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 12, width: "100%" },
});
