import { useSessionStore } from "@/auth/session-store";
import {
  Button,
  Card,
  Input,
  SafeAreaScreen,
  Text,
} from "@/design/components";
import { useTheme } from "@/design/theme";
import { listCommandsForPermissions } from "@/productivity/commands";
import { openProductivityRoute } from "@/productivity/navigate";
import { usePermissions } from "@/permissions/gate";
import { useTenantStore } from "@/tenant/context-store";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

export default function ComandosScreen() {
  const { colors, toggle } = useTheme();
  const permissions = usePermissions();
  const clearTenant = useTenantStore((s) => s.clearTenant);
  const logout = useSessionStore((s) => s.logout);
  const [filter, setFilter] = useState("");

  const commands = useMemo(
    () => listCommandsForPermissions(permissions, filter),
    [permissions, filter],
  );

  const run = async (id: string) => {
    const cmd = commands.find((c) => c.id === id);
    if (!cmd) return;

    if (cmd.action === "open-search") {
      router.push("/busca");
      return;
    }
    if (cmd.action === "open-scanner") {
      router.push("/scanner");
      return;
    }
    if (cmd.action === "toggle-theme") {
      await toggle();
      return;
    }
    if (cmd.action === "switch-tenant") {
      clearTenant();
      router.replace("/(auth)/tenant");
      return;
    }
    if (cmd.action === "switch-branch") {
      router.replace("/(auth)/branch");
      return;
    }
    if (cmd.action === "logout") {
      await logout();
      router.replace("/(auth)/login");
      return;
    }
    if (cmd.route) {
      await openProductivityRoute({
        route: cmd.route,
        opensWeb: cmd.opensWeb,
      });
    }
  };

  return (
    <SafeAreaScreen edges={["left", "right"]}>
      <View style={styles.header}>
        <Text variant="subtitle" accessibilityRole="header">
          Central de comandos
        </Text>
        <Input
          value={filter}
          onChangeText={setFilter}
          placeholder="Filtrar comandos…"
          autoFocus
          accessibilityLabel="Filtrar comandos"
          style={styles.input}
        />
      </View>

      <FlatList
        data={commands}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text variant="body" muted style={{ padding: 16 }}>
            Nenhum comando disponível para seu perfil.
          </Text>
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Pressable
              onPress={() => void run(item.id)}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityHint={`Grupo ${item.group}`}
              style={styles.row}
            >
              <View style={{ flex: 1 }}>
                <Text variant="body">{item.label}</Text>
                <Text variant="caption" muted>
                  {item.group}
                </Text>
              </View>
              <Text variant="caption" style={{ color: colors.primary }}>
                Abrir
              </Text>
            </Pressable>
          </Card>
        )}
        ListFooterComponent={
          <Button
            title="Fechar"
            variant="ghost"
            onPress={() => router.back()}
          />
        }
      />
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, gap: 8 },
  input: { minHeight: 48 },
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 8 },
  card: { padding: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    minHeight: 48,
  },
});
