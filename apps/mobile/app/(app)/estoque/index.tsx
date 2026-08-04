import {
  fetchStockDashboard,
  type MobileStockDashboard,
} from "@/api/mobile-api";
import { webHref } from "@/dashboard/web-links";
import { Button, ErrorState, SafeAreaScreen } from "@/design/components";
import {
  STOCK_VIEW_PERMS,
  StockAlerts,
  StockHeader,
  StockQuickActions,
  StockRecentMovements,
  StockSkeleton,
  StockSummaryCards,
  stockErrorMessage,
  throwStockApiError,
} from "@/stock/sections";
import {
  loadStockSnapshot,
  minutesSince,
  saveStockSnapshot,
} from "@/stock/offline-snapshot";
import { useNetworkStatus, isOnline } from "@/offline/network";
import { useHasAnyPermission } from "@/permissions/gate";
import { qk } from "@/query/keys";
import { useTenantStore } from "@/tenant/context-store";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

export default function EstoqueHomeScreen() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const tenantSlug = useTenantStore((s) => s.tenantSlug);
  const branchId = useTenantStore((s) => s.branchId);
  const branchName = useTenantStore((s) => s.branchName);
  const online = isOnline(useNetworkStatus());
  const canView = useHasAnyPermission(STOCK_VIEW_PERMS);

  const [offlineSnap, setOfflineSnap] = useState<{
    savedAt: number;
    data: MobileStockDashboard;
  } | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    void loadStockSnapshot(tenantId).then(setOfflineSnap);
  }, [tenantId]);

  const query = useQuery({
    queryKey: qk.module(tenantId || null, branchId, "stock-summary"),
    enabled: Boolean(tenantId) && online && canView,
    staleTime: 60_000,
    queryFn: async () => {
      const result = await fetchStockDashboard({ tenantId, branchId });
      if (!result.ok) throwStockApiError(result);
      await saveStockSnapshot(tenantId, result.data);
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
          message="Sem permissão de estoque/compras neste tenant."
        />
      </SafeAreaScreen>
    );
  }

  if (online && query.isLoading && !data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <StockSkeleton />
      </SafeAreaScreen>
    );
  }

  if (online && query.isError && !data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState
          title="Falha ao carregar"
          message={stockErrorMessage(
            query.error,
            "Não foi possível carregar o estoque.",
          )}
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
          message="Conecte-se para carregar o estoque pela primeira vez."
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
        <StockHeader
          branchName={branchName}
          updatedAtLabel={data.updatedAtLabel}
          offlineMinutes={offlineMinutes}
        />
        {data.unavailable.length > 0 ? (
          <ErrorState
            title="Dados parciais"
            message={`Indisponível: ${data.unavailable.join(", ")}. Campos sem fonte aparecem como —.`}
          />
        ) : null}
        <StockSummaryCards data={data} />
        <View style={{ height: 12 }} />
        <StockRecentMovements items={data.recentMovements} />
        <View style={{ height: 12 }} />
        <StockAlerts alerts={data.alerts} />
        <View style={{ height: 12 }} />
        <StockQuickActions
          actions={data.quickActions}
          onPress={(action) => {
            if (action.opensWeb) {
              void Linking.openURL(webHref(action.href));
              return;
            }
            if (action.href.startsWith("/estoque/")) {
              router.push(action.href as `/estoque/${string}`);
            }
          }}
        />
        {tenantSlug ? (
          <View style={{ marginTop: 16 }}>
            <Button
              title="Abrir Estoque web"
              variant="secondary"
              onPress={() =>
                void Linking.openURL(webHref(`/${tenantSlug}/estoque`))
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
