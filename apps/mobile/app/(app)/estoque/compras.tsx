import { fetchStockPurchases } from "@/api/mobile-api";
import {
  STOCK_VIEW_PERMS,
  StockSkeleton,
  stockErrorMessage,
  throwStockApiError,
} from "@/stock/sections";
import { Button, Card, ErrorState, SafeAreaScreen, Text } from "@/design/components";
import { useTheme } from "@/design/theme";
import { useNetworkStatus, isOnline } from "@/offline/network";
import { useHasAnyPermission } from "@/permissions/gate";
import { qk } from "@/query/keys";
import { useTenantStore } from "@/tenant/context-store";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { FlatList, Pressable, RefreshControl, View } from "react-native";

export default function EstoqueComprasScreen() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const branchId = useTenantStore((s) => s.branchId);
  const online = isOnline(useNetworkStatus());
  const canView = useHasAnyPermission(STOCK_VIEW_PERMS);
  const { colors } = useTheme();

  const query = useQuery({
    queryKey: qk.module(tenantId || null, branchId, "stock-purchases"),
    enabled: Boolean(tenantId) && online && canView,
    staleTime: 60_000,
    queryFn: async () => {
      const result = await fetchStockPurchases({ tenantId, branchId });
      if (!result.ok) throwStockApiError(result);
      return result.data;
    },
  });

  if (!canView) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState title="Acesso negado" message="Sem permissão." />
      </SafeAreaScreen>
    );
  }

  if (!online) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState title="Offline" message="Compras exigem conexão." />
      </SafeAreaScreen>
    );
  }

  if (query.isLoading && !query.data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <StockSkeleton />
      </SafeAreaScreen>
    );
  }

  if (query.isError && !query.data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState
          title="Falha ao carregar"
          message={stockErrorMessage(query.error, "Não foi possível listar compras.")}
          action={
            <Button title="Tentar novamente" onPress={() => void query.refetch()} />
          }
        />
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen edges={["left", "right"]}>
      <FlatList
        data={query.data?.items ?? []}
        keyExtractor={(i) => i.id}
        initialNumToRender={12}
        windowSize={7}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 8 }}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching}
            onRefresh={() => void query.refetch()}
          />
        }
        ListHeaderComponent={
          query.data?.unavailable ? (
            <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
              <ErrorState
                title="Schema parcial"
                message="Pedidos de compra podem estar indisponíveis neste tenant."
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ padding: 24 }}>
            <Text variant="body" style={{ color: colors.textMuted }}>
              Nenhum pedido de compra.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/estoque/compra/${item.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Abrir pedido ${item.numero}`}
          >
            <Card style={{ marginHorizontal: 16, marginBottom: 8 }}>
              <Text variant="subtitle">#{item.numero}</Text>
              <Text
                variant="caption"
                style={{ color: colors.textMuted, marginTop: 4 }}
              >
                {item.status}
                {item.valor ? ` · ${item.valor}` : ""}
              </Text>
              <Text variant="caption" style={{ color: colors.textMuted }}>
                {item.dataNecessidade
                  ? `Necessidade ${item.dataNecessidade}`
                  : item.createdAt.slice(0, 10)}
              </Text>
            </Card>
          </Pressable>
        )}
      />
    </SafeAreaScreen>
  );
}
