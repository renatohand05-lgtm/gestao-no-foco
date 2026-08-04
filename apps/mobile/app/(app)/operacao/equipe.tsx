import { fetchOpsTeam } from "@/api/mobile-api";
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

export default function OperacaoEquipeScreen() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const branchId = useTenantStore((s) => s.branchId);
  const online = isOnline(useNetworkStatus());
  const canView = useHasAnyPermission(OPS_VIEW_PERMS);
  const { colors } = useTheme();

  const query = useQuery({
    queryKey: qk.module(tenantId || null, branchId, "ops-team"),
    enabled: Boolean(tenantId) && online && canView,
    staleTime: 60_000,
    queryFn: async () => {
      const result = await fetchOpsTeam({ tenantId, branchId });
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
        <ErrorState title="Offline" message="Equipe exige conexão." />
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
          message={opsErrorMessage(query.error, "Não foi possível listar a equipe.")}
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
        keyExtractor={(item) => item.id}
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
              Nenhum mecânico encontrado.
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
              {[item.status, item.especialidade].filter(Boolean).join(" · ") || "—"}
            </Text>
            <Text
              variant="caption"
              style={{ color: colors.textMuted, marginTop: 2 }}
            >
              {[
                item.produtividade ? `Prod. ${item.produtividade}` : null,
                item.ocupacao ? `Ocup. ${item.ocupacao}` : null,
                item.emExecucao != null ? `${item.emExecucao} em execução` : null,
              ]
                .filter(Boolean)
                .join(" · ") || "—"}
            </Text>
          </Card>
        )}
      />
    </SafeAreaScreen>
  );
}
