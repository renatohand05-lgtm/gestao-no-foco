import { fetchStockInventory } from "@/api/mobile-api";
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
import { RefreshControl, ScrollView, View } from "react-native";

export default function EstoqueInventarioScreen() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const branchId = useTenantStore((s) => s.branchId);
  const online = isOnline(useNetworkStatus());
  const canView = useHasAnyPermission(STOCK_VIEW_PERMS);
  const { colors } = useTheme();

  const query = useQuery({
    queryKey: qk.module(tenantId || null, branchId, "stock-inventory"),
    enabled: Boolean(tenantId) && online && canView,
    staleTime: 60_000,
    queryFn: async () => {
      const result = await fetchStockInventory({ tenantId, branchId });
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
        <ErrorState title="Offline" message="Inventário detalhado exige conexão." />
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
          message={stockErrorMessage(query.error, "Não foi possível carregar inventário.")}
          action={
            <Button title="Tentar novamente" onPress={() => void query.refetch()} />
          }
        />
      </SafeAreaScreen>
    );
  }

  const data = query.data;
  if (!data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState title="Vazio" message="Inventário sem dados." />
      </SafeAreaScreen>
    );
  }

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
        {data.unavailable ? (
          <ErrorState
            title="Schema parcial"
            message="Inventário enterprise indisponível neste tenant. Conferência completa no web."
          />
        ) : null}
        <Card>
          <Text variant="subtitle">Resumo</Text>
          <Text variant="body" style={{ marginTop: 8 }}>
            Ciclos abertos:{" "}
            {data.ciclosAbertos != null ? String(data.ciclosAbertos) : "—"}
          </Text>
          <Text variant="body">
            Divergências:{" "}
            {data.divergencias != null ? String(data.divergencias) : "—"}
          </Text>
          <Text variant="body">
            Última conferência:{" "}
            {data.ultimaConferencia
              ? data.ultimaConferencia.slice(0, 16).replace("T", " ")
              : "—"}
          </Text>
        </Card>
        <Card>
          <Text variant="subtitle">Ciclos</Text>
          {data.cycles.length === 0 ? (
            <Text
              variant="body"
              style={{ color: colors.textMuted, marginTop: 8 }}
            >
              Nenhum ciclo de inventário.
            </Text>
          ) : (
            data.cycles.map((c) => (
              <View key={c.id} style={{ marginTop: 8 }}>
                <Text variant="body">
                  {c.kind} · {c.status}
                </Text>
                <Text variant="caption" style={{ color: colors.textMuted }}>
                  {c.createdAt.slice(0, 16).replace("T", " ")}
                </Text>
              </View>
            ))
          )}
        </Card>
        <Card>
          <Text variant="subtitle">Itens críticos (estoque baixo)</Text>
          {data.criticalHints.length === 0 ? (
            <Text
              variant="body"
              style={{ color: colors.textMuted, marginTop: 8 }}
            >
              Nenhum item crítico listado.
            </Text>
          ) : (
            data.criticalHints.map((h) => (
              <Text
                key={h}
                variant="body"
                style={{ color: colors.textMuted, marginTop: 6 }}
              >
                • {h}
              </Text>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaScreen>
  );
}
