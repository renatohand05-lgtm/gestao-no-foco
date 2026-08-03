import { fetchMe } from "@/api/mobile-api";
import { useSessionStore } from "@/auth/session-store";
import {
  Avatar,
  Card,
  ErrorState,
  LoadingState,
  SafeAreaScreen,
  Text,
} from "@/design/components";
import { useTenantStore } from "@/tenant/context-store";
import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, View } from "react-native";

export default function ProfileScreen() {
  const snapshot = useSessionStore((s) => s.snapshot);
  const tenantName = useTenantStore((s) => s.tenantName);
  const branchName = useTenantStore((s) => s.branchName);
  const continuedWithoutBranch = useTenantStore((s) => s.continuedWithoutBranch);
  const permissions = useTenantStore((s) => s.permissions);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["mobile", "me"],
    queryFn: async () => {
      const result = await fetchMe();
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
    staleTime: 60_000,
  });

  const displayName = data?.displayName ?? snapshot.displayName;
  const email = data?.email ?? snapshot.email;

  if (isLoading && !snapshot.email) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <LoadingState title="Carregando perfil…" />
      </SafeAreaScreen>
    );
  }

  if (isError && !snapshot.email) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState title="Perfil indisponível" message="Não foi possível carregar seus dados." />
      </SafeAreaScreen>
    );
  }

  const branchLabel = continuedWithoutBranch
    ? "Escopo da empresa (sem filial)"
    : branchName ?? "—";

  return (
    <SafeAreaScreen edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Avatar label={displayName ?? email ?? "?"} size={64} />
          <Text variant="title" style={styles.name}>
            {displayName}
          </Text>
          <Text variant="body" muted>
            {email}
          </Text>
        </View>

        <Card style={styles.card}>
          <Text variant="subtitle">Contexto</Text>
          <Text variant="body" muted>
            {tenantName || "—"} · {branchLabel}
          </Text>
          <Text variant="caption" muted style={styles.perms}>
            Permissões: {permissions.slice(0, 5).join(", ") || "—"}
            {permissions.length > 5 ? ` (+${permissions.length - 5})` : ""}
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  header: { alignItems: "center", marginBottom: 24 },
  name: { marginTop: 12 },
  card: { gap: 8 },
  perms: { marginTop: 8 },
});
