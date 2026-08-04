import { fetchStockMovements } from "@/api/mobile-api";
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
  Pressable,
  RefreshControl,
  TextInput,
  View,
} from "react-native";

const TIPOS = [
  { id: "all", label: "Todos" },
  { id: "entrada", label: "Entradas" },
  { id: "saida", label: "Saídas" },
  { id: "ajuste", label: "Ajustes" },
] as const;

export default function EstoqueMovimentacoesScreen() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const branchId = useTenantStore((s) => s.branchId);
  const online = isOnline(useNetworkStatus());
  const canView = useHasAnyPermission(STOCK_VIEW_PERMS);
  const { colors } = useTheme();
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]["id"]>("all");
  const deferredQ = useDeferredValue(q.trim());

  const query = useInfiniteQuery({
    queryKey: qk.entity({
      tenantId: tenantId || null,
      branchId,
      module: "stock-movements",
      filters: { q: deferredQ, tipo },
    }),
    enabled: Boolean(tenantId) && online && canView,
    staleTime: 60_000,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const result = await fetchStockMovements({
        tenantId,
        branchId,
        q: deferredQ || undefined,
        tipo,
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
        <ErrorState title="Acesso negado" message="Sem permissão." />
      </SafeAreaScreen>
    );
  }

  if (!online) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState
          title="Offline"
          message="Movimentações exigem conexão. Transferências e inventário detalhado: use o Estoque web."
        />
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen edges={["left", "right"]}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 8 }}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscar movimentação"
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
          accessibilityLabel="Buscar movimentação"
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {TIPOS.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setTipo(t.id)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor:
                  tipo === t.id ? colors.surface : "transparent",
                minHeight: 40,
                justifyContent: "center",
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: tipo === t.id }}
            >
              <Text variant="caption">{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {query.isLoading && !query.data ? (
        <StockSkeleton />
      ) : query.isError && !query.data ? (
        <ErrorState
          title="Falha ao carregar"
          message={stockErrorMessage(
            query.error,
            "Não foi possível listar movimentações.",
          )}
          action={
            <Button title="Tentar novamente" onPress={() => void query.refetch()} />
          }
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          initialNumToRender={14}
          maxToRenderPerBatch={16}
          windowSize={7}
          removeClippedSubviews
          contentContainerStyle={{ paddingBottom: 40, paddingTop: 8 }}
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
                Nenhuma movimentação.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card style={{ marginHorizontal: 16, marginBottom: 8 }}>
              <Text variant="caption" style={{ color: colors.textMuted }}>
                {item.tipo} · {item.at.slice(0, 16).replace("T", " ")}
              </Text>
              <Text variant="subtitle" style={{ marginTop: 4 }}>
                {item.produtoNome}
              </Text>
              <Text variant="caption" style={{ color: colors.textMuted }}>
                qtd {item.quantidade}
                {item.origem ? ` · ${item.origem}` : ""}
                {item.motivo ? ` · ${item.motivo}` : ""}
              </Text>
            </Card>
          )}
        />
      )}
    </SafeAreaScreen>
  );
}
