import {
  fetchIntelligencePack,
  type MobileIntelligencePack,
} from "@/api/mobile-api";
import {
  AlertsSection,
  BriefSection,
  DashboardHeader,
  DecisionSection,
  KpiGrid,
} from "@/dashboard/sections";
import { webHref } from "@/dashboard/web-links";
import {
  Button,
  ErrorState,
  SafeAreaScreen,
  Text,
} from "@/design/components";
import {
  AlertCenterSection,
  AnalyticsDecisionSection,
  IntelligenceMetasSection,
  IntelligenceSkeleton,
  KpiHealthSection,
  ModuleSyncSection,
  OperationalSection,
  SmartActionsSection,
} from "@/inteligencia/sections";
import {
  clearIntelligenceSnapshot,
  loadIntelligenceSnapshot,
  loadModuleSyncStatuses,
  minutesSince,
  saveIntelligenceSnapshot,
} from "@/inteligencia/offline-snapshot";
import { useNetworkStatus, isOnline } from "@/offline/network";
import { useHasAnyPermission } from "@/permissions/gate";
import { qk } from "@/query/keys";
import { useTenantStore } from "@/tenant/context-store";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

const EXEC_PERMS = [
  "dashboard.executivo",
  "analytics.executivo",
  "dashboard.visualizar",
] as const;

export default function InteligenciaScreen() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const tenantSlug = useTenantStore((s) => s.tenantSlug);
  const branchId = useTenantStore((s) => s.branchId);
  const branchName = useTenantStore((s) => s.branchName);
  const network = useNetworkStatus();
  const online = isOnline(network);
  const canView = useHasAnyPermission(EXEC_PERMS);
  const clearTenant = useTenantStore((s) => s.clearTenant);

  const [offlineSnap, setOfflineSnap] = useState<{
    savedAt: number;
    data: MobileIntelligencePack;
  } | null>(null);
  const [moduleSync, setModuleSync] = useState<
    { module: string; minutesAgo: number | null }[]
  >([]);

  useEffect(() => {
    if (!tenantId) return;
    void loadIntelligenceSnapshot(tenantId).then(setOfflineSnap);
    void loadModuleSyncStatuses(tenantId).then(setModuleSync);
  }, [tenantId]);

  const query = useQuery({
    queryKey: qk.module(tenantId || null, branchId, "intelligence-pack"),
    enabled: Boolean(tenantId) && online && canView,
    staleTime: 60_000,
    queryFn: async () => {
      const result = await fetchIntelligencePack({
        tenantId,
        branchId,
        branchName,
      });
      if (!result.ok) {
        const err = new Error(result.error.message) as Error & {
          status?: number;
        };
        err.status = result.status;
        throw err;
      }
      await saveIntelligenceSnapshot(tenantId, result.data);
      void loadModuleSyncStatuses(tenantId).then(setModuleSync);
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
          message="Sem permissão para Inteligência Executiva neste tenant."
          action={
            <Button
              title="Trocar empresa"
              onPress={() => {
                clearTenant();
                router.replace("/(auth)/tenant");
              }}
            />
          }
        />
      </SafeAreaScreen>
    );
  }

  if (online && query.isLoading && !data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <IntelligenceSkeleton />
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
              : "Não foi possível carregar a inteligência."
          }
          action={
            <Button title="Tentar novamente" onPress={() => void query.refetch()} />
          }
        />
      </SafeAreaScreen>
    );
  }

  if (!data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState
          title="Sem dados offline"
          message="Conecte-se para carregar o Cockpit de Inteligência pela primeira vez."
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
        <DashboardHeader
          data={data.dashboard}
          offlineMinutes={offlineMinutes}
        />

        <Text variant="subtitle" style={styles.sectionTitle}>
          KPIs executivos
        </Text>
        <KpiGrid kpis={data.dashboard.kpis} />

        <OperationalSection operational={data.operational} />
        <BriefSection brief={data.executiveBrief} />
        <DecisionSection decision={data.decision} />
        <AnalyticsDecisionSection pack={data.analyticsDecision} />
        <KpiHealthSection items={data.kpiHealth} />
        <AlertCenterSection center={data.alertCenter} />
        <AlertsSection alerts={data.dashboard.alerts} />
        <IntelligenceMetasSection metas={data.metas} />
        <SmartActionsSection
          actions={data.quickActions}
          onPress={(action) => {
            void Linking.openURL(webHref(action.href));
          }}
        />
        <ModuleSyncSection sync={data.moduleSync} modules={moduleSync} />

        <View style={styles.footerActions}>
          <Button
            title="Trocar empresa"
            variant="secondary"
            onPress={() => {
              void clearIntelligenceSnapshot(tenantId);
              clearTenant();
              router.replace("/(auth)/tenant");
            }}
          />
        </View>

        {tenantSlug ? (
          <Text variant="caption" muted style={styles.footerNote}>
            Drill-down detalhado no portal ({tenantSlug}).
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { marginTop: 8, marginBottom: 8 },
  footerActions: { gap: 8, marginTop: 24 },
  footerNote: { marginTop: 12, textAlign: "center" },
});
