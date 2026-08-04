import { fetchAccountsReceivable } from "@/api/mobile-api";
import {
  Button,
  EmptyState,
  ErrorState,
  SafeAreaScreen,
  Text,
} from "@/design/components";
import { useTheme } from "@/design/theme";
import { FINANCE_VIEW_PERMS, FinanceListRow, FinanceSkeleton } from "@/finance/sections";
import { useNetworkStatus, isOnline } from "@/offline/network";
import { useHasAnyPermission } from "@/permissions/gate";
import { qk } from "@/query/keys";
import { useTenantStore } from "@/tenant/context-store";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";

const FILTERS = [
  { id: "all", label: "Todas" },
  { id: "vencido", label: "Vencidas" },
  { id: "aberto", label: "Abertas" },
  { id: "recebido", label: "Recebidas" },
] as const;

export default function ContasReceberScreen() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const branchId = useTenantStore((s) => s.branchId);
  const online = isOnline(useNetworkStatus());
  const canView = useHasAnyPermission(FINANCE_VIEW_PERMS);
  const { colors } = useTheme();
  const [status, setStatus] = useState<string>("all");

  const query = useQuery({
    queryKey: qk.entity({
      tenantId: tenantId || null,
      branchId,
      module: "finance-ar",
      filters: { status, page: 1 },
    }),
    enabled: Boolean(tenantId) && online && canView,
    staleTime: 60_000,
    queryFn: async () => {
      const result = await fetchAccountsReceivable({
        tenantId,
        branchId,
        status: status === "all" ? undefined : status,
      });
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
        <ErrorState title="Acesso negado" message="Sem permissão para contas a receber." />
      </SafeAreaScreen>
    );
  }

  if (!online) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState
          title="Offline"
          message="Listas detalhadas exigem conexão. Consulte o resumo da home offline."
        />
      </SafeAreaScreen>
    );
  }

  return (
    <SafeAreaScreen edges={["left", "right"]}>
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.id}
            accessibilityRole="button"
            accessibilityState={{ selected: status === f.id }}
            onPress={() => setStatus(f.id)}
            style={[
              styles.chip,
              {
                borderColor: colors.border,
                backgroundColor: status === f.id ? colors.primary : colors.surface,
              },
            ]}
          >
            <Text
              variant="caption"
              style={{ color: status === f.id ? "#05070A" : colors.text }}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {query.isLoading ? (
        <FinanceSkeleton />
      ) : query.isError ? (
        <ErrorState
          title="Falha ao carregar"
          message={query.error instanceof Error ? query.error.message : "Erro"}
          action={<Button title="Tentar novamente" onPress={() => void query.refetch()} />}
        />
      ) : (
        <FlatList
          data={query.data?.items ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching}
              onRefresh={() => void query.refetch()}
            />
          }
          ListEmptyComponent={
            <EmptyState title="Sem títulos" message="Nenhuma conta a receber neste filtro." />
          }
          renderItem={({ item }) => (
            <FinanceListRow
              item={item}
              onPress={() =>
                router.push({
                  pathname: "/financeiro/detalhe/[id]",
                  params: { id: item.id, kind: "receber" },
                })
              }
            />
          )}
        />
      )}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 16, paddingBottom: 0 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
    justifyContent: "center",
  },
  list: { padding: 16, paddingBottom: 40 },
});
