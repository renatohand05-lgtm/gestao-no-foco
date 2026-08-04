import { fetchCashFlow } from "@/api/mobile-api";
import { Button, Card, ErrorState, SafeAreaScreen, Text } from "@/design/components";
import { useTheme } from "@/design/theme";
import { FINANCE_VIEW_PERMS, FinanceSkeleton } from "@/finance/sections";
import { useNetworkStatus, isOnline } from "@/offline/network";
import { useHasAnyPermission } from "@/permissions/gate";
import { qk } from "@/query/keys";
import { useTenantStore } from "@/tenant/context-store";
import { useQuery } from "@tanstack/react-query";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";

export default function FluxoCaixaScreen() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const branchId = useTenantStore((s) => s.branchId);
  const online = isOnline(useNetworkStatus());
  const canView = useHasAnyPermission([
    ...FINANCE_VIEW_PERMS,
    "financeiro.ver_fluxo_caixa",
  ]);
  const { colors } = useTheme();

  const query = useQuery({
    queryKey: qk.module(tenantId || null, branchId, "finance-cash-flow"),
    enabled: Boolean(tenantId) && online && canView,
    staleTime: 60_000,
    queryFn: async () => {
      const result = await fetchCashFlow({ tenantId, branchId });
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
        <ErrorState title="Acesso negado" message="Sem permissão para fluxo de caixa." />
      </SafeAreaScreen>
    );
  }

  if (!online) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState title="Offline" message="Fluxo detalhado exige conexão nesta sprint." />
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

  const { resumo, daily, period, unavailable } = query.data;

  return (
    <SafeAreaScreen edges={["left", "right"]}>
      <FlatList
        data={daily}
        keyExtractor={(d) => d.date}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching}
            onRefresh={() => void query.refetch()}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 8, marginBottom: 12 }}>
            <Text variant="caption" style={{ color: colors.textMuted }}>
              {period.dataDe} → {period.dataAte}
              {unavailable ? " · dados indisponíveis" : ""}
            </Text>
            <Card>
              <Text variant="subtitle">Saldo atual: {resumo.saldoAtual ?? "—"}</Text>
              <Text variant="caption" style={{ color: colors.textMuted, marginTop: 4 }}>
                Inicial {resumo.saldoInicial ?? "—"} · Entradas {resumo.entradas ?? "—"} ·
                Saídas {resumo.saidas ?? "—"}
              </Text>
              <Text variant="caption" style={{ color: colors.textMuted, marginTop: 4 }}>
                Final {resumo.saldoFinal ?? "—"} · Projetado {resumo.saldoProjetado ?? "—"}
              </Text>
            </Card>
            <Text variant="subtitle">Últimos dias (lista — sem gráfico no first paint)</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={{ marginBottom: 8 }}>
            <Text variant="subtitle">{item.date}</Text>
            <Text variant="caption" style={{ color: colors.textMuted, marginTop: 4 }}>
              Entradas {item.entradas} · Saídas {item.saidas} · Saldo {item.saldo}
            </Text>
          </Card>
        )}
      />
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
});
