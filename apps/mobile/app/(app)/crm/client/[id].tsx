import { fetchCrmClientDetail } from "@/api/mobile-api";
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
import { useLocalSearchParams } from "expo-router";
import { RefreshControl, ScrollView, View } from "react-native";

export default function CrmClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tenantId = useTenantStore((s) => s.tenantId);
  const branchId = useTenantStore((s) => s.branchId);
  const online = isOnline(useNetworkStatus());
  const canView = useHasAnyPermission(CRM_VIEW_PERMS);
  const { colors } = useTheme();

  const query = useQuery({
    queryKey: qk.entity({
      tenantId: tenantId || null,
      branchId,
      module: "crm-client",
      filters: { id },
    }),
    enabled: Boolean(tenantId && id) && online && canView,
    staleTime: 60_000,
    queryFn: async () => {
      const result = await fetchCrmClientDetail({ tenantId, id, branchId });
      if (!result.ok) throwCrmApiError(result);
      return result.data;
    },
  });

  if (!canView) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState title="Acesso negado" message="Sem permissão de clientes." />
      </SafeAreaScreen>
    );
  }

  if (!online) {
    return (
      <SafeAreaScreen edges={["left", "right"]}>
        <ErrorState
          title="Offline"
          message="Detalhe do cliente exige conexão. O resumo do CRM Home pode estar disponível offline."
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
          message={crmErrorMessage(query.error, "Não foi possível carregar o cliente.")}
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
        <ErrorState title="Não encontrado" message="Cliente indisponível." />
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
        <Text variant="title">{data.nome}</Text>
        <Text variant="caption" style={{ color: colors.textMuted }}>
          Score comercial: {data.score ?? "—"}
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
        {data.tags.length ? (
          <Card>
            <Text variant="subtitle">Tags</Text>
            <Text variant="body" style={{ marginTop: 6 }}>
              {data.tags.join(", ")}
            </Text>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaScreen>
  );
}
