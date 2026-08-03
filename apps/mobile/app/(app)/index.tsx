import { useSessionStore } from "@/auth/session-store";
import {
  Badge,
  Card,
  KpiPlaceholder,
  SafeAreaScreen,
  Text,
} from "@/design/components";
import { useNetworkStatus, isOnline } from "@/offline/network";
import { useTenantStore } from "@/tenant/context-store";
import { FUTURE_MODULE_CARDS } from "@gof/domain";
import { ScrollView, StyleSheet, View } from "react-native";

export default function HomeScreen() {
  const snapshot = useSessionStore((s) => s.snapshot);
  const tenantName = useTenantStore((s) => s.tenantName);
  const branchName = useTenantStore((s) => s.branchName);
  const segmentId = useTenantStore((s) => s.segmentId);
  const network = useNetworkStatus();

  return (
    <SafeAreaScreen edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="display">Olá, {snapshot.displayName ?? "usuário"}</Text>
        <Text variant="body" muted style={styles.subtitle}>
          Foundation mobile — sem métricas inventadas.
        </Text>

        <View style={styles.row}>
          <Badge label={tenantName || "Sem tenant"} />
          <Badge label={branchName ?? "Sem filial"} />
          <Badge
            label={isOnline(network) ? "Online" : "Offline"}
            tone={isOnline(network) ? "success" : "warning"}
          />
        </View>

        <Card style={styles.card}>
          <Text variant="subtitle">Sessão</Text>
          <Text variant="body" muted>
            Estado: {snapshot.state}
          </Text>
          <Text variant="caption" muted>
            Segmento: {segmentId ?? "—"}
          </Text>
        </Card>

        <Text variant="subtitle" style={styles.section}>
          Módulos futuros
        </Text>
        <View style={styles.modules}>
          {FUTURE_MODULE_CARDS.map((mod) => (
            <Card key={mod.id} style={styles.moduleCard}>
              <Text variant="subtitle">{mod.label}</Text>
              <Badge label="Planejado" />
            </Card>
          ))}
        </View>

        <Text variant="subtitle" style={styles.section}>
          KPIs (placeholder)
        </Text>
        <View style={styles.kpiRow}>
          <KpiPlaceholder label="Indicador A" />
          <KpiPlaceholder label="Indicador B" />
        </View>
      </ScrollView>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
  subtitle: { marginTop: 8, marginBottom: 16 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  card: { marginBottom: 16 },
  section: { marginBottom: 12, marginTop: 8 },
  modules: { gap: 8, marginBottom: 16 },
  moduleCard: { gap: 8 },
  kpiRow: { flexDirection: "row", gap: 12 },
});
