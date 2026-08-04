import { fetchDreMobile } from "@/api/mobile-api";
import { Button, Card, ErrorState, SafeAreaScreen, Text } from "@/design/components";
import { useTheme } from "@/design/theme";
import { FINANCE_VIEW_PERMS, FinanceSkeleton } from "@/finance/sections";
import { useNetworkStatus, isOnline } from "@/offline/network";
import { useHasAnyPermission } from "@/permissions/gate";
import { qk } from "@/query/keys";
import { useTenantStore } from "@/tenant/context-store";
import { useQuery } from "@tanstack/react-query";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";

export default function DreScreen() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const branchId = useTenantStore((s) => s.branchId);
  const online = isOnline(useNetworkStatus());
  const canView = useHasAnyPermission([...FINANCE_VIEW_PERMS, "financeiro.ver_dre"]);
  const { colors } = useTheme();

  const query = useQuery({
    queryKey: qk.module(tenantId || null, branchId, "finance-dre"),
    enabled: Boolean(tenantId) && online && canView,
    staleTime: 60_000,
    queryFn: async () => {
      const result = await fetchDreMobile({ tenantId, branchId });
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
        <ErrorState title="Acesso negado" message="Sem permissão para DRE." />
      </SafeAreaScreen>
    );
  }

  if (!online) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState title="Offline" message="DRE detalhado exige conexão nesta sprint." />
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
        <Text variant="caption" style={{ color: colors.textMuted }}>
          {data.period.dataDe} → {data.period.dataAte} · fórmulas canônicas da web
        </Text>
        {data.unavailable ? (
          <ErrorState title="DRE indisponível" message="Sem fonte canônica no período." />
        ) : (
          <View style={{ gap: 8, marginTop: 8 }}>
            {data.lines.map((line) => (
              <Card key={line.id}>
                <Text
                  variant={line.emphasis ? "subtitle" : "caption"}
                  style={{ color: line.emphasis ? colors.text : colors.textMuted }}
                >
                  {line.label}
                </Text>
                <Text variant="subtitle" style={{ marginTop: 4 }}>
                  {line.value}
                </Text>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
});
