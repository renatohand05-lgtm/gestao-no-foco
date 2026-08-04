import { fetchOpsNotifications } from "@/api/mobile-api";
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
import { useQuery } from "@tanstack/react-query";
import { FlatList, RefreshControl, View } from "react-native";

export default function OperacaoNotificacoesScreen() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const branchId = useTenantStore((s) => s.branchId);
  const online = isOnline(useNetworkStatus());
  const canView = useHasAnyPermission(OPS_VIEW_PERMS);
  const { colors } = useTheme();

  const query = useQuery({
    queryKey: qk.module(tenantId || null, branchId, "ops-notifications"),
    enabled: Boolean(tenantId) && online && canView,
    staleTime: 60_000,
    queryFn: async () => {
      const result = await fetchOpsNotifications({ tenantId, branchId });
      if (!result.ok) throwOpsApiError(result);
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
        <ErrorState
          title="Offline"
          message="Alertas detalhados exigem conexão. Resumo pode estar na Operação Home offline."
        />
      </SafeAreaScreen>
    );
  }

  if (query.isLoading && !query.data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <OpsSkeleton />
      </SafeAreaScreen>
    );
  }

  if (query.isError && !query.data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState
          title="Falha ao carregar"
          message={opsErrorMessage(query.error, "Não foi possível carregar alertas.")}
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
        data={query.data?.alerts ?? []}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 8 }}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching}
            onRefresh={() => void query.refetch()}
          />
        }
        ListEmptyComponent={
          <View style={{ padding: 24 }}>
            <Text variant="body" style={{ color: colors.textMuted }}>
              Nenhum alerta.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={{ marginHorizontal: 16, marginBottom: 8 }}>
            <Text variant="caption" style={{ color: colors.textMuted }}>
              {item.category} · {item.priority}
            </Text>
            <Text variant="subtitle" style={{ marginTop: 4 }}>
              {item.title}
            </Text>
            <Text
              variant="body"
              style={{ color: colors.textMuted, marginTop: 4 }}
            >
              {item.description}
            </Text>
          </Card>
        )}
      />
    </SafeAreaScreen>
  );
}
