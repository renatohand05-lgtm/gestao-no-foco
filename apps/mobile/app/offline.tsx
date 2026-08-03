import { loadSessionMetadata } from "@/auth/secure-session";
import { Button, EmptyState, SafeAreaScreen, Text } from "@/design/components";
import { useSessionStore } from "@/auth/session-store";
import { useTenantStore } from "@/tenant/context-store";
import { OFFLINE_SESSION_TTL_MS } from "@/auth/offline-gate";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";

export default function OfflineScreen() {
  const boot = useSessionStore((s) => s.boot);
  const tenantName = useTenantStore((s) => s.tenantName);
  const [validatedAt, setValidatedAt] = useState<string | null>(null);

  useEffect(() => {
    void loadSessionMetadata().then((m) => setValidatedAt(m.lastValidatedAt));
  }, []);

  const ttlHours = Math.round(OFFLINE_SESSION_TTL_MS / (60 * 60 * 1000));

  return (
    <SafeAreaScreen>
      <EmptyState
        title="Modo offline limitado"
        message={`Leitura local do shell, perfil e contexto (${tenantName || "empresa"}). Mutações e dados financeiros exigem conexão. Válido por até ${ttlHours}h desde a última validação online.`}
        action={
          <>
            {validatedAt ? (
              <Text variant="caption" muted style={styles.meta}>
                Última validação: {new Date(validatedAt).toLocaleString("pt-BR")}
              </Text>
            ) : null}
            <Button
              title="Tentar reconectar"
              onPress={async () => {
                await boot();
                router.replace("/");
              }}
            />
          </>
        }
      />
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  meta: { marginBottom: 12, textAlign: "center" },
});
