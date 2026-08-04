import { fetchOpsWorkOrders } from "@/api/mobile-api";
import {
  OPS_VIEW_PERMS,
  OpsSkeleton,
  opsErrorMessage,
  throwOpsApiError,
} from "@/operacao/sections";
import { Button, Card, ErrorState, SafeAreaScreen, Text } from "@/design/components";
import { useTheme } from "@/design/theme";
import { useNetworkStatus, isOnline } from "@/offline/network";
import { useHasAnyPermission } from "@/permissions/gate";
import { qk } from "@/query/keys";
import { useTenantStore } from "@/tenant/context-store";
import { useInfiniteQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useDeferredValue, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  TextInput,
  View,
} from "react-native";

export default function OperacaoOrdensScreen() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const branchId = useTenantStore((s) => s.branchId);
  const online = isOnline(useNetworkStatus());
  const canView = useHasAnyPermission(OPS_VIEW_PERMS);
  const { colors } = useTheme();
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q.trim());

  const query = useInfiniteQuery({
    queryKey: qk.entity({
      tenantId: tenantId || null,
      branchId,
      module: "ops-work-orders",
      filters: { q: deferredQ },
    }),
    enabled: Boolean(tenantId) && online && canView,
    staleTime: 60_000,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const result = await fetchOpsWorkOrders({
        tenantId,
        branchId,
        q: deferredQ || undefined,
        page: pageParam,
      });
      if (!result.ok) throwOpsApiError(result);
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
          message="Lista de ordens exige conexão. O resumo da Operação pode estar disponível offline."
        />
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen edges={["left", "right"]}>
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Buscar OS, cliente, placa…"
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
          accessibilityLabel="Buscar ordem"
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>
      {query.isLoading && !query.data ? (
        <OpsSkeleton />
      ) : query.isError && !query.data ? (
        <ErrorState
          title="Falha ao carregar"
          message={opsErrorMessage(query.error, "Não foi possível listar ordens.")}
          action={
            <Button title="Tentar novamente" onPress={() => void query.refetch()} />
          }
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          initialNumToRender={12}
          maxToRenderPerBatch={16}
          windowSize={7}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
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
                Nenhuma ordem encontrada.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/operacao/ordens/${item.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir ordem ${item.numero}`}
            >
              <Card style={{ marginHorizontal: 16, marginBottom: 8 }}>
                <Text variant="subtitle">
                  OS {item.numero} · {item.status}
                </Text>
                <Text
                  variant="caption"
                  style={{ color: colors.textMuted, marginTop: 4 }}
                >
                  {[item.cliente, item.veiculo].filter(Boolean).join(" · ") || "—"}
                </Text>
                <Text
                  variant="caption"
                  style={{ color: colors.textMuted, marginTop: 2 }}
                >
                  {[item.prioridade, item.valor].filter(Boolean).join(" · ") || "—"}
                </Text>
              </Card>
            </Pressable>
          )}
        />
      )}
    </SafeAreaScreen>
  );
}
