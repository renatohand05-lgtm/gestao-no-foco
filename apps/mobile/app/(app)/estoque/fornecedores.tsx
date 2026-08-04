import { fetchStockSuppliers } from "@/api/mobile-api";
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
import { useInfiniteQuery } from "@tanstack/react-query";
import { useDeferredValue, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  TextInput,
  View,
} from "react-native";

export default function EstoqueFornecedoresScreen() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const branchId = useTenantStore((s) => s.branchId);
  const online = isOnline(useNetworkStatus());
  const canView = useHasAnyPermission(STOCK_VIEW_PERMS);
  const { colors } = useTheme();
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q.trim());

  const query = useInfiniteQuery({
    queryKey: qk.entity({
      tenantId: tenantId || null,
      branchId,
      module: "stock-suppliers",
      filters: { q: deferredQ },
    }),
    enabled: Boolean(tenantId) && online && canView,
    staleTime: 60_000,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const result = await fetchStockSuppliers({
        tenantId,
        branchId,
        q: deferredQ || undefined,
        page: pageParam,
      });
      if (!result.ok) throwStockApiError(result);
      return result.data;
    },
    getNextPageParam: (last) =>
      last.page < last.totalPages ? last.page + 1 : undefined,
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  if (!canView) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState title="Acesso negado" message="Sem permissão de fornecedores." />
      </SafeAreaScreen>
    );
  }

  if (!online) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState title="Offline" message="Fornecedores exigem conexão." />
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen edges={["left", "right"]}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscar fornecedor"
          placeholderTextColor={colors.textMuted}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: colors.text,
            backgroundColor: colors.surface,
            minHeight: 44,
          }}
          accessibilityLabel="Buscar fornecedor"
        />
      </View>
      {query.isLoading && !query.data ? (
        <StockSkeleton />
      ) : query.isError && !query.data ? (
        <ErrorState
          title="Falha ao carregar"
          message={stockErrorMessage(
            query.error,
            "Não foi possível listar fornecedores.",
          )}
          action={
            <Button title="Tentar novamente" onPress={() => void query.refetch()} />
          }
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          initialNumToRender={12}
          windowSize={7}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching && !query.isFetchingNextPage}
              onRefresh={() => void query.refetch()}
            />
          }
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) {
              void query.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={{ padding: 24 }}>
              <Text variant="body" style={{ color: colors.textMuted }}>
                Nenhum fornecedor encontrado.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card style={{ marginHorizontal: 16, marginBottom: 8 }}>
              <Text variant="subtitle">{item.nome}</Text>
              <Text
                variant="caption"
                style={{ color: colors.textMuted, marginTop: 4 }}
              >
                {[item.contato, item.cidade].filter(Boolean).join(" · ") || "—"}
              </Text>
              <Text variant="caption" style={{ color: colors.textMuted }}>
                {item.ativo ? "Ativo" : "Inativo"}
                {item.comprasRecentes != null
                  ? ` · ${item.comprasRecentes} compra(s)`
                  : ""}
                {item.valorComprado ? ` · ${item.valorComprado}` : ""}
              </Text>
            </Card>
          )}
        />
      )}
    </SafeAreaScreen>
  );
}
