import { fetchCrmForecast } from "@/api/mobile-api";
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
import { RefreshControl, ScrollView, View } from "react-native";

export default function CrmForecastScreen() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const branchId = useTenantStore((s) => s.branchId);
  const online = isOnline(useNetworkStatus());
  const canView = useHasAnyPermission(CRM_VIEW_PERMS);
  const { colors } = useTheme();

  const query = useQuery({
    queryKey: qk.module(tenantId || null, branchId, "crm-forecast"),
    enabled: Boolean(tenantId) && online && canView,
    staleTime: 60_000,
    queryFn: async () => {
      const result = await fetchCrmForecast({ tenantId, branchId });
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
          message="Forecast detalhado exige conexão. O resumo do CRM Home pode estar disponível offline."
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
          message={crmErrorMessage(query.error, "Não foi possível carregar o forecast.")}
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
        <ErrorState title="Vazio" message="Forecast sem dados." />
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
        <Card>
          <Text variant="subtitle">Resumo</Text>
          <Text variant="body" style={{ marginTop: 8 }}>
            Prevista: {data.prevista ?? "—"}
          </Text>
          <Text variant="body">Provável: {data.provavel ?? "—"}</Text>
          <Text variant="body">Fechada: {data.fechada ?? "—"}</Text>
          <Text variant="body">Conversão: {data.conversao ?? "—"}</Text>
        </Card>
        <Card>
          <Text variant="subtitle">Funil ponderado</Text>
          {data.funil.length === 0 ? (
            <Text
              variant="body"
              style={{ color: colors.textMuted, marginTop: 8 }}
            >
              Sem estágios no funil.
            </Text>
          ) : (
            data.funil.map((f) => (
              <View key={f.stage} style={{ marginTop: 8 }}>
                <Text variant="body">{f.stage}</Text>
                <Text variant="caption" style={{ color: colors.textMuted }}>
                  {f.count} · {f.valor} · pond. {f.ponderado}
                </Text>
              </View>
            ))
          )}
        </Card>
        <Card>
          <Text variant="subtitle">Por responsável</Text>
          {data.porResponsavel.length === 0 ? (
            <Text
              variant="body"
              style={{ color: colors.textMuted, marginTop: 8 }}
            >
              Sem responsáveis.
            </Text>
          ) : (
            data.porResponsavel.map((r) => (
              <View key={r.nome} style={{ marginTop: 8 }}>
                <Text variant="body">{r.nome}</Text>
                <Text variant="caption" style={{ color: colors.textMuted }}>
                  {r.prevista} / {r.provavel} / {r.fechada}
                </Text>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaScreen>
  );
}
