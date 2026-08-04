import { fetchOpsWorkOrderDetail } from "@/api/mobile-api";
import { webHref } from "@/dashboard/web-links";
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
import { useLocalSearchParams } from "expo-router";
import { Linking, RefreshControl, ScrollView, View } from "react-native";

export default function OperacaoOrdemDetailScreen() {
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
      module: "ops-work-order",
      filters: { id },
    }),
    enabled: Boolean(tenantId && id) && online && canView,
    staleTime: 60_000,
    queryFn: async () => {
      const result = await fetchOpsWorkOrderDetail({ tenantId, id, branchId });
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
        <ErrorState title="Offline" message="Detalhe da ordem exige conexão." />
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
          message={opsErrorMessage(query.error, "Não foi possível carregar a ordem.")}
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
        <ErrorState title="Não encontrado" message="Ordem indisponível." />
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
        <Text variant="title">OS {data.numero}</Text>
        <Text variant="caption" style={{ color: colors.textMuted }}>
          {data.status}
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
        {data.services.length > 0 ? (
          <Card>
            <Text variant="subtitle">Serviços</Text>
            {data.services.map((s) => (
              <View key={s.id} style={{ marginTop: 8 }}>
                <Text variant="body">{s.label}</Text>
                <Text variant="caption" style={{ color: colors.textMuted }}>
                  qtd {s.qty}
                  {s.valor ? ` · ${s.valor}` : ""}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}
        {data.parts.length > 0 ? (
          <Card>
            <Text variant="subtitle">Peças</Text>
            {data.parts.map((p) => (
              <View key={p.id} style={{ marginTop: 8 }}>
                <Text variant="body">{p.label}</Text>
                <Text variant="caption" style={{ color: colors.textMuted }}>
                  qtd {p.qty}
                  {p.valor ? ` · ${p.valor}` : ""}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}
        {data.timeline.length > 0 ? (
          <Card>
            <Text variant="subtitle">Linha do tempo</Text>
            {data.timeline.map((t) => (
              <View key={t.id} style={{ marginTop: 8 }}>
                <Text variant="body">{t.titulo}</Text>
                <Text variant="caption" style={{ color: colors.textMuted }}>
                  {t.at.slice(0, 16).replace("T", " ")}
                  {t.detalhe ? ` · ${t.detalhe}` : ""}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}
        {data.observations ? (
          <Card>
            <Text variant="subtitle">Observações</Text>
            <Text variant="body" style={{ marginTop: 6 }}>
              {data.observations}
            </Text>
          </Card>
        ) : null}
        <Button
          title="Continuar no portal"
          onPress={() => void Linking.openURL(webHref(data.webHref))}
        />
      </ScrollView>
    </SafeAreaScreen>
  );
}
