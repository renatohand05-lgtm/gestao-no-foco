import { fetchStockPurchaseDetail } from "@/api/mobile-api";
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
import { useLocalSearchParams } from "expo-router";
import { RefreshControl, ScrollView, View } from "react-native";

export default function EstoqueCompraDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tenantId = useTenantStore((s) => s.tenantId);
  const branchId = useTenantStore((s) => s.branchId);
  const online = isOnline(useNetworkStatus());
  const canView = useHasAnyPermission(STOCK_VIEW_PERMS);
  const { colors } = useTheme();

  const query = useQuery({
    queryKey: qk.entity({
      tenantId: tenantId || null,
      branchId,
      module: "stock-purchase",
      filters: { id },
    }),
    enabled: Boolean(tenantId && id) && online && canView,
    staleTime: 60_000,
    queryFn: async () => {
      const result = await fetchStockPurchaseDetail({ tenantId, id, branchId });
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
        <ErrorState title="Offline" message="Detalhe da compra exige conexão." />
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
          message={stockErrorMessage(query.error, "Não foi possível carregar o pedido.")}
          action={
            <Button title="Tentar novamente" onPress={() => void query.refetch()} />
          }
        />
      </SafeAreaScreen>
    );
  }

  if (!query.data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState title="Não encontrado" message="Pedido indisponível." />
      </SafeAreaScreen>
    );
  }

  const data = query.data;
  return (
    <SafeAreaScreen edges={["left", "right"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching}
            onRefresh={() => void query.refetch()}
          />
        }
      >
        <Text variant="title">Pedido #{data.numero}</Text>
        <Text variant="caption" style={{ color: colors.textMuted }}>
          {data.status}
          {data.valor ? ` · ${data.valor}` : ""}
        </Text>
        <Card>
          {data.fields.map((f) => (
            <View key={f.label} style={{ marginBottom: 8 }}>
              <Text variant="caption" style={{ color: colors.textMuted }}>
                {f.label}
              </Text>
              <Text variant="body">{f.value}</Text>
            </View>
          ))}
        </Card>
        <Card>
          <Text variant="subtitle">Itens</Text>
          {data.items.length === 0 ? (
            <Text
              variant="body"
              style={{ color: colors.textMuted, marginTop: 8 }}
            >
              Sem itens.
            </Text>
          ) : (
            data.items.map((it, idx) => (
              <View key={`${it.label}-${idx}`} style={{ marginTop: 8 }}>
                <Text variant="body">{it.label}</Text>
                <Text variant="caption" style={{ color: colors.textMuted }}>
                  qtd {it.qty}
                  {it.valor ? ` · ${it.valor}` : ""}
                </Text>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaScreen>
  );
}
