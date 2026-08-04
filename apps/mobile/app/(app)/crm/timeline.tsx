import { fetchCrmTimeline } from "@/api/mobile-api";
import {
  CRM_VIEW_PERMS,
  CrmSkeleton,
  crmErrorMessage,
  throwCrmApiError,
} from "@/crm/sections";
import { Button, Card, ErrorState, SafeAreaScreen, Text } from "@/design/components";
import { useTheme } from "@/design/theme";
import { useNetworkStatus, isOnline } from "@/offline/network";
import { useHasAnyPermission } from "@/permissions/gate";
import { qk } from "@/query/keys";
import { useTenantStore } from "@/tenant/context-store";
import { useQuery } from "@tanstack/react-query";
import { FlatList, RefreshControl, View } from "react-native";

export default function CrmTimelineScreen() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const branchId = useTenantStore((s) => s.branchId);
  const online = isOnline(useNetworkStatus());
  const canView = useHasAnyPermission(CRM_VIEW_PERMS);
  const { colors } = useTheme();

  const query = useQuery({
    queryKey: qk.module(tenantId || null, branchId, "crm-timeline"),
    enabled: Boolean(tenantId) && online && canView,
    staleTime: 60_000,
    queryFn: async () => {
      const result = await fetchCrmTimeline({ tenantId, branchId });
      if (!result.ok) throwCrmApiError(result);
      return result.data;
    },
  });

  if (!canView) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState title="Acesso negado" message="Sem permissão de CRM." />
      </SafeAreaScreen>
    );
  }

  if (!online) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState
          title="Offline"
          message="Timeline exige conexão. O resumo do CRM Home pode estar disponível offline."
        />
      </SafeAreaScreen>
    );
  }

  if (query.isLoading && !query.data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <CrmSkeleton />
      </SafeAreaScreen>
    );
  }

  if (query.isError && !query.data) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState
          title="Falha ao carregar"
          message={crmErrorMessage(query.error, "Não foi possível carregar a timeline.")}
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
        initialNumToRender={14}
        maxToRenderPerBatch={16}
        windowSize={7}
        removeClippedSubviews
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
              Nenhum evento na timeline.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={{ marginHorizontal: 16, marginBottom: 8 }}>
            <Text variant="caption" style={{ color: colors.textMuted }}>
              {item.tipo} · {item.at.slice(0, 16).replace("T", " ")}
            </Text>
            <Text variant="subtitle" style={{ marginTop: 4 }}>
              {item.titulo}
            </Text>
            {item.descricao ? (
              <Text
                variant="body"
                style={{ color: colors.textMuted, marginTop: 4 }}
              >
                {item.descricao}
              </Text>
            ) : null}
          </Card>
        )}
      />
    </SafeAreaScreen>
  );
}
