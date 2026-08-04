import {
  fetchFinanceSummary,
  type MobileFinanceSummary,
} from "@/api/mobile-api";
import { webHref } from "@/dashboard/web-links";
import {
  Button,
  ErrorState,
  SafeAreaScreen,
} from "@/design/components";
import {
  FINANCE_VIEW_PERMS,
  FinanceAlerts,
  FinanceHeader,
  FinanceQuickActions,
  FinanceSkeleton,
  FinanceSummaryCards,
} from "@/finance/sections";
import {
  loadFinanceSnapshot,
  minutesSince,
  saveFinanceSnapshot,
} from "@/finance/offline-snapshot";
import { useNetworkStatus, isOnline } from "@/offline/network";
import { useHasAnyPermission } from "@/permissions/gate";
import { qk } from "@/query/keys";
import { useTenantStore } from "@/tenant/context-store";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

export default function FinanceHomeScreen() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const tenantSlug = useTenantStore((s) => s.tenantSlug);
  const branchId = useTenantStore((s) => s.branchId);
  const branchName = useTenantStore((s) => s.branchName);
  const network = useNetworkStatus();
  const online = isOnline(network);
  const canView = useHasAnyPermission(FINANCE_VIEW_PERMS);

  const [offlineSnap, setOfflineSnap] = useState<{
    savedAt: number;
    data: MobileFinanceSummary;
  } | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    void loadFinanceSnapshot(tenantId).then(setOfflineSnap);
  }, [tenantId]);

  const query = useQuery({
    queryKey: qk.module(tenantId || null, branchId, "finance-summary"),
    enabled: Boolean(tenantId) && online && canView,
    staleTime: 60_000,
    queryFn: async () => {
      const result = await fetchFinanceSummary({ tenantId, branchId });
      if (!result.ok) {
        const err = new Error(result.error.message) as Error & { status?: number };
        err.status = result.status;
        throw err;
      }
      await saveFinanceSnapshot(tenantId, result.data);
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
          message="Sem permissão financeira neste tenant."
        />
      </SafeAreaScreen>
    );
  }

  if (online && query.isLoading && !data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <FinanceSkeleton />
      </SafeAreaScreen>
    );
  }

  if (online && query.isError && !data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState
          title="Falha ao carregar"
          message={
            query.error instanceof Error
              ? query.error.message
              : "Não foi possível carregar o financeiro."
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
          message="Conecte-se para carregar o financeiro pela primeira vez."
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
        <FinanceHeader
          branchName={branchName}
          updatedAtLabel={data.updatedAtLabel}
          period={data.period}
          offlineMinutes={offlineMinutes}
        />
        {data.unavailable.length > 0 ? (
          <ErrorState
            title="Dados parciais"
            message={`Indisponível: ${data.unavailable.join(", ")}. Campos sem fonte aparecem como — (não como zero).`}
          />
        ) : null}
        <FinanceSummaryCards data={data} />
        <View style={{ height: 12 }} />
        <FinanceAlerts alerts={data.alerts} />
        <View style={{ height: 12 }} />
        <FinanceQuickActions
          actions={data.quickActions}
          onPress={(action) => {
            if (action.opensWeb) {
              void Linking.openURL(webHref(action.href));
              return;
            }
            router.push(action.href as `/financeiro/${string}`);
          }}
        />
        {tenantSlug ? (
          <View style={{ marginTop: 16 }}>
            <Button
              title="Abrir financeiro web"
              variant="secondary"
              onPress={() => void Linking.openURL(webHref(`/${tenantSlug}/financeiro`))}
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
