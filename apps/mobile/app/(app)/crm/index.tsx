import {
  fetchCrmDashboard,
  type MobileCrmDashboard,
} from "@/api/mobile-api";
import { webHref } from "@/dashboard/web-links";
import {
  Button,
  ErrorState,
  SafeAreaScreen,
} from "@/design/components";
import {
  CRM_VIEW_PERMS,
  CrmAlerts,
  CrmDecisionBrief,
  CrmHeader,
  CrmQuickActions,
  CrmSkeleton,
  CrmSummaryCards,
  crmErrorMessage,
  throwCrmApiError,
} from "@/crm/sections";
import {
  loadCrmSnapshot,
  minutesSince,
  saveCrmSnapshot,
} from "@/crm/offline-snapshot";
import { useNetworkStatus, isOnline } from "@/offline/network";
import { useHasAnyPermission } from "@/permissions/gate";
import { qk } from "@/query/keys";
import { useTenantStore } from "@/tenant/context-store";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

export default function CrmHomeScreen() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const tenantSlug = useTenantStore((s) => s.tenantSlug);
  const branchId = useTenantStore((s) => s.branchId);
  const branchName = useTenantStore((s) => s.branchName);
  const network = useNetworkStatus();
  const online = isOnline(network);
  const canView = useHasAnyPermission(CRM_VIEW_PERMS);

  const [offlineSnap, setOfflineSnap] = useState<{
    savedAt: number;
    data: MobileCrmDashboard;
  } | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    void loadCrmSnapshot(tenantId).then(setOfflineSnap);
  }, [tenantId]);

  const query = useQuery({
    queryKey: qk.module(tenantId || null, branchId, "crm-summary"),
    enabled: Boolean(tenantId) && online && canView,
    staleTime: 60_000,
    queryFn: async () => {
      const result = await fetchCrmDashboard({ tenantId, branchId });
      if (!result.ok) throwCrmApiError(result);
      await saveCrmSnapshot(tenantId, result.data);
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
          message="Sem permissão de CRM neste tenant."
        />
      </SafeAreaScreen>
    );
  }

  if (online && query.isLoading && !data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <CrmSkeleton />
      </SafeAreaScreen>
    );
  }

  if (online && query.isError && !data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState
          title="Falha ao carregar"
          message={crmErrorMessage(query.error, "Não foi possível carregar o CRM.")}
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
          message="Conecte-se para carregar o CRM pela primeira vez."
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
        <CrmHeader
          branchName={branchName}
          updatedAtLabel={data.updatedAtLabel}
          offlineMinutes={offlineMinutes}
        />
        {data.unavailable.length > 0 ? (
          <ErrorState
            title="Dados parciais"
            message={`Indisponível: ${data.unavailable.join(", ")}. Campos sem fonte aparecem como — (não como zero).`}
          />
        ) : null}
        <CrmSummaryCards data={data} />
        <View style={{ height: 12 }} />
        <CrmDecisionBrief lines={data.decisionBrief} />
        <View style={{ height: 12 }} />
        <CrmAlerts alerts={data.alerts} />
        <View style={{ height: 12 }} />
        <CrmQuickActions
          actions={data.quickActions}
          onPress={(action) => {
            if (action.opensWeb) {
              void Linking.openURL(webHref(action.href));
              return;
            }
            if (action.href.startsWith("/crm/")) {
              router.push(action.href as `/crm/${string}`);
            }
          }}
        />
        {tenantSlug ? (
          <View style={{ marginTop: 16 }}>
            <Button
              title="Abrir CRM web"
              variant="secondary"
              onPress={() =>
                void Linking.openURL(webHref(`/${tenantSlug}/crm/executivo`))
              }
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 8, paddingBottom: 40 },
});
