import { fetchExecutiveDashboard, type MobileExecutiveDashboard } from "@/api/mobile-api";
import { useSessionStore } from "@/auth/session-store";
import {
  AlertsSection,
  BriefSection,
  DashboardHeader,
  DashboardSkeleton,
  DecisionSection,
  KpiGrid,
  MetasSection,
} from "@/dashboard/sections";
import {
  clearDashboardSnapshot,
  loadDashboardSnapshot,
  minutesSince,
  saveDashboardSnapshot,
} from "@/dashboard/offline-snapshot";
import { webHref } from "@/dashboard/web-links";
import {
  Button,
  ErrorState,
  SafeAreaScreen,
  Text,
} from "@/design/components";
import { useNetworkStatus, isOnline } from "@/offline/network";
import { useHasAnyPermission } from "@/permissions/gate";
import { qk } from "@/query/keys";
import { useTenantStore } from "@/tenant/context-store";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

const EXEC_PERMS = ["dashboard.executivo", "analytics.executivo", "dashboard.visualizar"] as const;

export default function HomeScreen() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const tenantSlug = useTenantStore((s) => s.tenantSlug);
  const branchId = useTenantStore((s) => s.branchId);
  const branchName = useTenantStore((s) => s.branchName);
  const network = useNetworkStatus();
  const online = isOnline(network);
  const canView = useHasAnyPermission(EXEC_PERMS);
  const clearTenant = useTenantStore((s) => s.clearTenant);
  const logout = useSessionStore((s) => s.logout);

  const [offlineSnap, setOfflineSnap] = useState<{
    savedAt: number;
    data: MobileExecutiveDashboard;
  } | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    void loadDashboardSnapshot(tenantId).then(setOfflineSnap);
  }, [tenantId]);

  const query = useQuery({
    queryKey: qk.module(tenantId || null, branchId, "dashboard-executive"),
    enabled: Boolean(tenantId) && online && canView,
    staleTime: 60_000,
    queryFn: async () => {
      const result = await fetchExecutiveDashboard({
        tenantId,
        branchId,
        branchName,
      });
      if (!result.ok) {
        const err = new Error(result.error.message) as Error & { status?: number };
        err.status = result.status;
        throw err;
      }
      await saveDashboardSnapshot(tenantId, result.data);
      return result.data;
    },
  });

  const data = query.data ?? offlineSnap?.data ?? null;
  const snapshotAt = query.dataUpdatedAt || offlineSnap?.savedAt || 0;
  const offlineMinutes =
    !online && data && snapshotAt > 0 ? minutesSince(snapshotAt) : null;

  if (!canView) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState
          title="Acesso negado"
          message="Sem permissão para o Dashboard Executivo neste tenant."
          action={
            <Button title="Trocar empresa" onPress={() => {
              clearTenant();
              router.replace("/(auth)/tenant");
            }} />
          }
        />
      </SafeAreaScreen>
    );
  }

  if (online && query.isLoading && !data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <DashboardSkeleton />
      </SafeAreaScreen>
    );
  }

  if (online && query.isError && !data) {
    const status = (query.error as { status?: number })?.status;
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState
          title={status === 403 ? "Acesso negado" : "Falha ao carregar"}
          message={
            query.error instanceof Error
              ? query.error.message
              : "Não foi possível carregar o dashboard."
          }
          action={<Button title="Tentar novamente" onPress={() => void query.refetch()} />}
        />
      </SafeAreaScreen>
    );
  }

  if (!data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState
          title="Sem dados offline"
          message="Conecte-se para carregar o Dashboard Executivo pela primeira vez."
        />
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen edges={["left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          online ? (
            <RefreshControl
              refreshing={query.isFetching}
              onRefresh={() => void query.refetch()}
            />
          ) : undefined
        }
      >
        <DashboardHeader data={data} offlineMinutes={offlineMinutes} />

        <Text variant="subtitle" style={styles.sectionTitle}>
          KPIs executivos
        </Text>
        <KpiGrid kpis={data.kpis} />

        <BriefSection brief={data.brief} />
        <DecisionSection decision={data.decision} />
        <AlertsSection alerts={data.alerts} />
        <MetasSection metas={data.metas} />

        <Text variant="subtitle" style={styles.sectionTitle}>
          Ações rápidas
        </Text>
        <View style={styles.actions}>
          {data.quickActions
            .filter((a) => a.enabled)
            .map((action) => (
              <Pressable
                key={action.id}
                style={styles.actionBtn}
                onPress={() => {
                  void Linking.openURL(webHref(action.href));
                }}
              >
                <Text variant="caption">{action.label}</Text>
              </Pressable>
            ))}
        </View>

        <View style={styles.footerActions}>
          <Button
            title="Trocar empresa"
            variant="secondary"
            onPress={() => {
              void clearDashboardSnapshot(tenantId);
              clearTenant();
              router.replace("/(auth)/tenant");
            }}
          />
          <Button title="Sair" variant="ghost" onPress={() => void logout()} />
        </View>

        {tenantSlug ? (
          <Text variant="caption" muted style={styles.footerNote}>
            Módulos detalhados abrem no web ({tenantSlug}).
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { marginTop: 8, marginBottom: 8 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#C9A84C55",
    minWidth: "45%",
    flexGrow: 1,
  },
  footerActions: { gap: 8, marginTop: 24 },
  footerNote: { marginTop: 12, textAlign: "center" },
});
