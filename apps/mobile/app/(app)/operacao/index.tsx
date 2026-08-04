import {
  fetchOpsDashboard,
  type MobileOpsDashboard,
} from "@/api/mobile-api";
import { webHref } from "@/dashboard/web-links";
import { Button, Card, ErrorState, SafeAreaScreen, Text } from "@/design/components";
import {
  OPS_VIEW_PERMS,
  OpsAlerts,
  OpsHeader,
  OpsQuickActions,
  OpsSkeleton,
  OpsSummaryCards,
  opsErrorMessage,
  throwOpsApiError,
} from "@/operacao/sections";
import {
  loadOpsSnapshot,
  minutesSince,
  saveOpsSnapshot,
} from "@/operacao/offline-snapshot";
import { useNetworkStatus, isOnline } from "@/offline/network";
import { useHasAnyPermission } from "@/permissions/gate";
import { qk } from "@/query/keys";
import { useTenantStore } from "@/tenant/context-store";
import { useTheme } from "@/design/theme";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

export default function OperacaoHomeScreen() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const tenantSlug = useTenantStore((s) => s.tenantSlug);
  const branchId = useTenantStore((s) => s.branchId);
  const branchName = useTenantStore((s) => s.branchName);
  const online = isOnline(useNetworkStatus());
  const canView = useHasAnyPermission(OPS_VIEW_PERMS);
  const { colors } = useTheme();

  const [offlineSnap, setOfflineSnap] = useState<{
    savedAt: number;
    data: MobileOpsDashboard;
  } | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    void loadOpsSnapshot(tenantId).then(setOfflineSnap);
  }, [tenantId]);

  const query = useQuery({
    queryKey: qk.module(tenantId || null, branchId, "ops-summary"),
    enabled: Boolean(tenantId) && online && canView,
    staleTime: 60_000,
    queryFn: async () => {
      const result = await fetchOpsDashboard({ tenantId, branchId });
      if (!result.ok) throwOpsApiError(result);
      await saveOpsSnapshot(tenantId, result.data);
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
          message="Sem permissão de operação neste tenant."
        />
      </SafeAreaScreen>
    );
  }

  if (online && query.isLoading && !data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <OpsSkeleton />
      </SafeAreaScreen>
    );
  }

  if (online && query.isError && !data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState
          title="Falha ao carregar"
          message={opsErrorMessage(
            query.error,
            "Não foi possível carregar a operação.",
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
          message="Conecte-se para carregar a operação pela primeira vez."
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
        <OpsHeader
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
        <OpsSummaryCards data={data} />
        <View style={{ height: 12 }} />
        {data.recentOrders.length > 0 ? (
          <Card>
            <Text variant="subtitle">Ordens recentes</Text>
            {data.recentOrders.map((o) => (
              <View key={o.id} style={{ marginTop: 10 }}>
                <Text variant="body">
                  OS {o.numero} · {o.status}
                </Text>
                <Text variant="caption" style={{ color: colors.textMuted }}>
                  {[o.cliente, o.veiculo].filter(Boolean).join(" · ") || "—"}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}
        <View style={{ height: 12 }} />
        <OpsAlerts alerts={data.alerts} />
        <View style={{ height: 12 }} />
        <OpsQuickActions
          actions={data.quickActions}
          onPress={(action) => {
            if (action.opensWeb) {
              void Linking.openURL(webHref(action.href));
              return;
            }
            if (action.href.startsWith("/operacao/")) {
              router.push(action.href as `/operacao/${string}`);
            }
          }}
        />
        {tenantSlug ? (
          <View style={{ marginTop: 16 }}>
            <Button
              title="Abrir Operação web"
              variant="secondary"
              onPress={() =>
                void Linking.openURL(webHref(`/${tenantSlug}/centro-operacoes`))
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
