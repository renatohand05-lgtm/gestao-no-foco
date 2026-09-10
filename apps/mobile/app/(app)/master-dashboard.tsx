import { fetchMasterDashboard, type MasterDashboard } from "@/api/mobile-api";
import {
  Card,
  KpiCard,
  SafeAreaScreen,
  Text,
} from "@/design/components";
import { useTheme } from "@/design/theme";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

export default function MasterDashboardScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [data, setData] = useState<MasterDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const result = await fetchMasterDashboard();
      if (ignore) return;
      if (result.ok) {
        setData(result.data);
      } else {
        setError(result.error.message);
      }
      setLoading(false);
    })();
    return () => {
      ignore = true;
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaScreen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaScreen>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaScreen>
        <View style={styles.center}>
          <Text variant="body" muted>
            {error ?? "Acesso restrito ao dono/parceiro da plataforma."}
          </Text>
        </View>
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="display">Painel master</Text>
        <Text variant="body" muted>
          {data.role === "owner"
            ? "Visão de todas as empresas"
            : "Empresas indicadas por você"}
        </Text>

        <TouchableOpacity
          style={[styles.notifRow, { backgroundColor: colors.surfaceElevated }]}
          onPress={() => router.push("/(app)/master-suporte")}
        >
          <Text variant="body">Central de suporte</Text>
          {data.unreadSupportMessages > 0 ? (
            <View style={[styles.badge, { backgroundColor: colors.danger }]}>
              <Text variant="caption" style={{ color: "#fff" }}>
                {data.unreadSupportMessages}
              </Text>
            </View>
          ) : (
            <Text variant="caption" muted>
              Sem pendências
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.kpiRow}>
          <KpiCard label="Empresas ativas" value={String(data.totals.empresasAtivas)} />
          <KpiCard
            label="Faturamento total"
            value={data.totals.faturamentoLabel}
          />
          <KpiCard
            label="Lucro líquido total"
            value={data.totals.lucroLiquidoLabel}
          />
          <KpiCard label="Total de empresas" value={String(data.totals.empresasTotal)} />
        </View>

        <Text variant="subtitle" style={{ marginTop: 16 }}>
          Empresas
        </Text>
        {data.companies.length === 0 ? (
          <Text variant="body" muted>
            Nenhuma empresa ainda.
          </Text>
        ) : (
          data.companies.map((c) => (
            <Card key={c.tenantId} style={styles.companyCard}>
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontWeight: "500" }}>
                  {c.tenantName}
                </Text>
                <Text variant="caption" muted>
                  {c.tenantSlug} {c.segment ? `· ${c.segment}` : ""}
                </Text>
              </View>
              <Text variant="body" style={{ fontWeight: "500" }}>
                {c.faturamentoLabel}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  kpiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  companyCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
});
