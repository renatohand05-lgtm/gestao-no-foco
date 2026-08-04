import { fetchFinanceApprovals } from "@/api/mobile-api";
import { webHref } from "@/dashboard/web-links";
import { Button, Card, ErrorState, SafeAreaScreen, Text } from "@/design/components";
import { useTheme } from "@/design/theme";
import { FINANCE_VIEW_PERMS, FinanceSkeleton } from "@/finance/sections";
import { useNetworkStatus, isOnline } from "@/offline/network";
import { useHasAnyPermission } from "@/permissions/gate";
import { qk } from "@/query/keys";
import { useTenantStore } from "@/tenant/context-store";
import { useQuery } from "@tanstack/react-query";
import { Linking, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

export default function AprovacoesScreen() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const branchId = useTenantStore((s) => s.branchId);
  const online = isOnline(useNetworkStatus());
  const canView = useHasAnyPermission([
    ...FINANCE_VIEW_PERMS,
    "financeiro.aprovar",
  ]);
  const { colors } = useTheme();

  const query = useQuery({
    queryKey: qk.module(tenantId || null, branchId, "finance-approvals"),
    enabled: Boolean(tenantId) && online && canView,
    staleTime: 60_000,
    queryFn: async () => {
      const result = await fetchFinanceApprovals({ tenantId, branchId });
      if (!result.ok) {
        const err = new Error(result.error.message) as Error & { status?: number };
        err.status = result.status;
        throw err;
      }
      return result.data;
    },
  });

  if (!canView) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState title="Acesso negado" message="Sem permissão para aprovações." />
      </SafeAreaScreen>
    );
  }

  if (!online) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState
          title="Offline"
          message="Aprovações são bloqueadas offline. Nenhuma mutação financeira offline nesta sprint."
        />
      </SafeAreaScreen>
    );
  }

  if (query.isLoading) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <FinanceSkeleton />
      </SafeAreaScreen>
    );
  }

  if (query.isError || !query.data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState
          title="Falha ao carregar"
          message={query.error instanceof Error ? query.error.message : "Erro"}
          action={<Button title="Tentar novamente" onPress={() => void query.refetch()} />}
        />
      </SafeAreaScreen>
    );
  }

  const data = query.data;

  return (
    <SafeAreaScreen edges={["left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching}
            onRefresh={() => void query.refetch()}
          />
        }
      >
        <Card>
          <Text variant="subtitle">Aprovações (PARCIAL nesta sprint)</Text>
          <Text variant="caption" style={{ color: colors.textMuted, marginTop: 8 }}>
            {data.message}
          </Text>
          <View style={{ marginTop: 16 }}>
            <Button
              title="Abrir aprovações na web"
              onPress={() => void Linking.openURL(webHref(data.webHref))}
            />
          </View>
        </Card>
        {!data.available ? (
          <Text variant="caption" style={{ color: colors.textMuted, marginTop: 12 }}>
            Runtime enterprise permanece na web — sem aprovar/reprovar pelo app nesta sprint.
          </Text>
        ) : null}
      </ScrollView>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
});
