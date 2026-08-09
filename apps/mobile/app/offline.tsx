import { loadSessionMetadata } from "@/auth/secure-session";
import {
  messageForAuthFailure,
} from "@/auth/recovery-policy";
import { Button, EmptyState, SafeAreaScreen, Text } from "@/design/components";
import { useSessionStore } from "@/auth/session-store";
import { useTenantStore } from "@/tenant/context-store";
import { OFFLINE_SESSION_TTL_MS } from "@/auth/offline-gate";
import { resolveBootRoute } from "@/auth/guards";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

export default function OfflineScreen() {
  const boot = useSessionStore((s) => s.boot);
  const returnToLogin = useSessionStore((s) => s.returnToLogin);
  const tenantName = useTenantStore((s) => s.tenantName);
  const [validatedAt, setValidatedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadSessionMetadata().then((m) => setValidatedAt(m.lastValidatedAt));
  }, []);

  const ttlHours = Math.round(OFFLINE_SESSION_TTL_MS / (60 * 60 * 1000));

  const handleReturnToLogin = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await returnToLogin(
        "offline_return_to_login",
        messageForAuthFailure("network"),
      );
      router.replace(resolveBootRoute("unauthenticated"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaScreen>
      <EmptyState
        title="Modo offline limitado"
        message={`Falha ao carregar sem conexão. ${messageForAuthFailure("network")} Leitura local do shell, perfil e contexto (${tenantName || "empresa"}). Mutações e dados financeiros exigem conexão. Válido por até ${ttlHours}h desde a última validação online.`}
        action={
          <View style={styles.actions}>
            {validatedAt ? (
              <Text variant="caption" muted style={styles.meta}>
                Última validação: {new Date(validatedAt).toLocaleString("pt-BR")}
              </Text>
            ) : null}
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
              onPress={handleReturnToLogin}
            />
          </View>
        }
      />
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  meta: { marginBottom: 12, textAlign: "center" },
  actions: { gap: 12, width: "100%" },
});
