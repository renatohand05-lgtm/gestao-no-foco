import { fetchOpsCustomerDetail } from "@/api/mobile-api";
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
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";

export default function OperacaoClienteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tenantId = useTenantStore((s) => s.tenantId);
  const branchId = useTenantStore((s) => s.branchId);
  const online = isOnline(useNetworkStatus());
  const canView = useHasAnyPermission(OPS_VIEW_PERMS);
  const { colors } = useTheme();

  const query = useQuery({
    queryKey: qk.entity({
      tenantId: tenantId || null,
      branchId,
      module: "ops-customer",
      filters: { id },
    }),
    enabled: Boolean(tenantId && id) && online && canView,
    staleTime: 60_000,
    queryFn: async () => {
      const result = await fetchOpsCustomerDetail({ tenantId, id, branchId });
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
        <ErrorState title="Offline" message="Detalhe do cliente exige conexão." />
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
          message={opsErrorMessage(query.error, "Não foi possível carregar o cliente.")}
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
        {data.vehicles.length > 0 ? (
          <Card>
            <Text variant="subtitle">Veículos</Text>
            {data.vehicles.map((v) => (
              <Pressable
                key={v.id}
                onPress={() => router.push(`/operacao/veiculos/${v.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Abrir veículo ${v.label}`}
                style={{ marginTop: 10 }}
              >
                <Text variant="body">{v.label}</Text>
              </Pressable>
            ))}
          </Card>
        ) : null}
        {data.recentOrders.length > 0 ? (
          <Card>
            <Text variant="subtitle">{data.workOrdersLabel ?? "Atendimentos"}</Text>
            {data.recentOrders.map((o) => (
              <Pressable
                key={o.id}
                onPress={() => router.push(`/operacao/ordens/${o.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Abrir ${data.workOrderShort ?? "atendimento"} ${o.numero}`}
                style={{ marginTop: 10 }}
              >
                <Text variant="body">
                  {data.workOrderShort ?? "Atendimento"} {o.numero} · {o.status}
                </Text>
              </Pressable>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaScreen>
  );
}
